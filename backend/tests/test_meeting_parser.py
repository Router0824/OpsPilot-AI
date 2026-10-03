from app.services.meeting import parse_meeting_demo


def test_meeting_parser_extracts_actions_decisions_and_deadlines():
    notes = "Alice will implement baseline A. Bob will evaluate retrieval. We decided not to use baseline X because recall was poor. Deadline is next Friday."
    result = parse_meeting_demo(notes)

    assert {item.owner for item in result.action_items} == {"Alice", "Bob"}
    assert all(item.deadline for item in result.action_items)
    assert result.decisions
    assert "recall was poor" in result.decisions[0].reason
    assert result.risks[0].suggested_action
