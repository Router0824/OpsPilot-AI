from app.services.planning import generate_plan


def test_demo_plan_forms_dependency_dag(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    plan, usage = generate_plan("Finish in two weeks", "Evaluate memory")
    titles = {task.title for task in plan.tasks}

    assert usage is None
    assert len(plan.tasks) == 4
    assert all(set(task.dependencies).issubset(titles) for task in plan.tasks)
    assert plan.tasks[-1].dependencies

