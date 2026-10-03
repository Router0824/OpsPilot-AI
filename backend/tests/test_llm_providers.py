from types import SimpleNamespace

from app.config import Settings
from app.schemas import AgentAnswer
from app.services.llm import LLMService


def test_deepseek_provider_is_selected():
    settings = Settings(demo_mode=False, deepseek_api_key="test-key")

    assert settings.provider == "deepseek"


def test_deepseek_json_output_is_schema_validated():
    payload = AgentAnswer(
        answer="Grounded answer",
        findings=["Finding"],
        knowledge_gaps=[],
        recommended_actions=["Act"],
        groundedness="SUPPORTED",
    ).model_dump_json()

    class Completions:
        def create(self, **kwargs):
            assert kwargs["response_format"] == {"type": "json_object"}
            assert "JSON Schema" in kwargs["messages"][0]["content"]
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=payload))],
                usage=SimpleNamespace(total_tokens=42),
            )

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs["base_url"] == "https://api.deepseek.com"
            self.chat = SimpleNamespace(completions=Completions())

    service = LLMService()
    service.settings = SimpleNamespace(
        deepseek_api_key="test-key",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-flash",
    )
    result, usage = service._parse_deepseek(FakeClient, "Return evidence", "Question", AgentAnswer)

    assert result.groundedness == "SUPPORTED"
    assert usage == 42
