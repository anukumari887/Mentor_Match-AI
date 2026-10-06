from app.recommender import recommend
from app.schemas import LearnerInput, MentorInput


def mentor(identifier, skills, *, experience=0, price=500, rating=0, count=0, availability=None):
    return MentorInput(
        id=identifier,
        skills=skills,
        headline="Engineer mentor",
        bio="Practical software engineering guidance",
        experienceYears=experience,
        pricePerHour=price,
        ratingAvg=rating,
        ratingCount=count,
        availability=availability or [],
    )


def test_exact_skill_overlap_ranks_above_no_overlap():
    learner = LearnerInput(wantedSkills=["python", "machine learning"], goals="Learn applied machine learning")
    items = recommend(learner, [mentor("none", ["Java"]), mentor("match", ["Python", "Machine Learning"])], 5)
    assert items[0]["id"] == "match"
    assert items[0]["breakdown"]["skill"] > items[1]["breakdown"]["skill"]


def test_skill_aliases_match():
    learner = LearnerInput(wantedSkills=["ml", "py"])
    items = recommend(learner, [mentor("alias", ["Machine Learning", "Python"])], 5)
    assert items[0]["breakdown"]["skill"] == 1.0


def test_new_mentor_has_no_rating_penalty():
    learner = LearnerInput(wantedSkills=["react"])
    items = recommend(learner, [mentor("new", ["React"], experience=4)], 5)
    assert items[0]["breakdown"]["rating"] == 0.8
    assert items[0]["score"] > 0


def test_over_budget_penalty_reduces_equal_match_score():
    learner = LearnerInput(wantedSkills=["python"], budgetPerHour=500)
    items = recommend(learner, [
        mentor("within", ["Python"], price=500),
        mentor("over", ["Python"], price=1000),
    ], 5)
    by_id = {item["id"]: item for item in items}
    assert by_id["within"]["score"] > by_id["over"]["score"]
    assert by_id["over"]["overBudget"] is True


def test_availability_overlap_is_normalized_to_learner_minutes():
    learner = LearnerInput(wantedSkills=["python"], availability=[
        {"dayOfWeek": 6, "startTime": "10:00", "endTime": "14:00"}
    ])
    matching = mentor("matching", ["Python"], availability=[
        {"dayOfWeek": 6, "startTime": "11:00", "endTime": "13:00"}
    ])
    items = recommend(learner, [matching], 5)
    assert items[0]["breakdown"]["availability"] == 0.5
    assert any(reason.startswith("Free on Sat") for reason in items[0]["reasons"])


def test_empty_inputs_return_an_empty_list():
    assert recommend(LearnerInput(), [], 5) == []
    assert recommend(LearnerInput(), [mentor("empty", [])], 5)[0]["score"] >= 0