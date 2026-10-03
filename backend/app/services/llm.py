"""Provider adapters for structured generation and deterministic demo mode."""

import json
from typing import Type, TypeVar

from pydantic import BaseModel

from ..config import get_settings


SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def available(self) -> bool:
        return self.settings.provider != "demo" and not self.settings.demo_mode

    def parse(self, system: str, prompt: str, schema: Type[SchemaT]) -> tuple[SchemaT, int | None]:
        if not self.available:
            raise RuntimeError("Structured generation requested in demo mode")
        from openai import AzureOpenAI, OpenAI

        if self.settings.provider == "deepseek":
            return self._parse_deepseek(OpenAI, system, prompt, schema)
        if self.settings.provider == "azure":
            client = AzureOpenAI(
                api_key=self.settings.azure_openai_api_key,
                azure_endpoint=self.settings.azure_openai_endpoint,
                api_version=self.settings.azure_openai_api_version,
            )
            model = self.settings.azure_openai_deployment
        else:
            client = OpenAI(api_key=self.settings.openai_api_key)
            model = self.settings.openai_model
        response = client.responses.parse(model=model, instructions=system, input=prompt, text_format=schema)
        parsed = response.output_parsed
        if parsed is None:
            raise RuntimeError("Model returned no structured output")
        usage = getattr(response, "usage", None)
        total_tokens = getattr(usage, "total_tokens", None) if usage else None
        return parsed, total_tokens

    def _parse_deepseek(
        self,
        client_type: type,
        system: str,
        prompt: str,
        schema: Type[SchemaT],
    ) -> tuple[SchemaT, int | None]:
        """Use DeepSeek JSON Output, then enforce the requested Pydantic schema."""
        client = client_type(
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            timeout=60.0,
            max_retries=1,
        )
        schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
        instructions = (
            f"{system}\n\n"
            "Return one valid JSON object only, without Markdown fences or commentary. "
            "The JSON must satisfy this JSON Schema exactly:\n"
            f"{schema_json}"
        )
        last_error: Exception | None = None
        for attempt in range(2):
            retry_note = "" if attempt == 0 else "\nYour previous output was empty or invalid. Return valid JSON now."
            response = client.chat.completions.create(
                model=self.settings.deepseek_model,
                messages=[
                    {"role": "system", "content": instructions + retry_note},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                max_tokens=4096,
                temperature=0,
                stream=False,
            )
            content = response.choices[0].message.content
            try:
                if not content:
                    raise ValueError("DeepSeek returned empty JSON content")
                parsed = schema.model_validate_json(content)
                usage = getattr(response, "usage", None)
                total_tokens = getattr(usage, "total_tokens", None) if usage else None
                return parsed, total_tokens
            except (ValueError, TypeError) as error:
                last_error = error
        raise RuntimeError("DeepSeek returned invalid structured output after two attempts") from last_error
