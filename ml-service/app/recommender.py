from __future__ import annotations

from collections import defaultdict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .schemas import AvailabilityWindow, LearnerInput, MentorInput

WEIGHTS = {
    "skill": 0.40,
    "goal": 0.20,
    "availability": 0.15,
    "rating": 0.15,
    "experience": 0.10,
}

ALIASES = {
    "ml": "machine learning",
    "js": "javascript",
    "py": "python",
    "ds": "data science",
    "dsa": "data structures",
    "react.js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "ux": "user experience",
    "ui": "user interface",
}

DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def normalize(value: str) -> str:
    cleaned = " ".join(value.lower().strip().split())
    return ALIASES.get(cleaned, cleaned)


def _minute(time_value: str) -> int:
    hour, minute = (int(part) for part in time_value.split(":"))
    return hour * 60 + minute


def _skill_scores(learner: LearnerInput, mentors: list[MentorInput]) -> np.ndarray:
    wanted = " ".join(normalize(skill) for skill in learner.wanted_skills)
    if not wanted.strip():
        return np.zeros(len(mentors))

    corpus = [wanted]
    corpus.extend(" ".join(normalize(skill) for skill in mentor.skills) for mentor in mentors)
    try:
        vectors = TfidfVectorizer().fit_transform(corpus)
        return cosine_similarity(vectors[0:1], vectors[1:]).ravel()
    except ValueError:
        return np.zeros(len(mentors))


def _goal_scores(learner: LearnerInput, mentors: list[MentorInput]) -> np.ndarray:
    if not learner.goals.strip():
        return np.full(len(mentors), 0.5)

    corpus = [learner.goals]
    corpus.extend(" ".join([mentor.headline, mentor.bio, *mentor.skills]) for mentor in mentors)
    try:
        vectors = TfidfVectorizer().fit_transform(corpus)
        return cosine_similarity(vectors[0:1], vectors[1:]).ravel()
    except ValueError:
        return np.zeros(len(mentors))


def _availability_overlap(
    learner_windows: list[AvailabilityWindow], mentor_windows: list[AvailabilityWindow]
) -> tuple[float, tuple[int, int, int] | None]:
    learner_minutes = sum(_minute(window.end_time) - _minute(window.start_time) for window in learner_windows)
    if learner_minutes == 0:
        return 0.5, None

    learner_by_day: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for window in learner_windows:
        learner_by_day[window.day_of_week].append((_minute(window.start_time), _minute(window.end_time)))

    overlap = 0
    first_match = None
    for mentor_window in mentor_windows:
        mentor_start = _minute(mentor_window.start_time)
        mentor_end = _minute(mentor_window.end_time)
        for learner_start, learner_end in learner_by_day[mentor_window.day_of_week]:
            start = max(mentor_start, learner_start)
            end = min(mentor_end, learner_end)
            if end > start:
                overlap += end - start
                if first_match is None:
                    first_match = (mentor_window.day_of_week, start, end)

    return min(overlap / learner_minutes, 1.0), first_match


def _reasons(
    learner: LearnerInput,
    mentor: MentorInput,
    overlap: tuple[int, int, int] | None,
    over_budget: bool,
) -> list[str]:
    wanted = {normalize(skill) for skill in learner.wanted_skills}
    mentor_skills = {normalize(skill) for skill in mentor.skills}
    shared = sorted(wanted & mentor_skills)
    reasons = []

    if shared:
        reasons.append(f"Teaches {', '.join(shared[:3])}")
    if overlap:
        day, start, end = overlap
        reasons.append(f"Free on {DAY_NAMES[day]} {start // 60:02d}:{start % 60:02d}-{end // 60:02d}:{end % 60:02d}")
    if mentor.experience_years:
        reasons.append(f"{mentor.experience_years} years of experience")
    if not over_budget and learner.budget_per_hour > 0:
        reasons.append("Within your budget")
    return reasons[:3]


def recommend(learner: LearnerInput, mentors: list[MentorInput], limit: int) -> list[dict]:
    if not mentors:
        return []

    skills = _skill_scores(learner, mentors)
    goals = _goal_scores(learner, mentors)
    ranked = []

    for index, mentor in enumerate(mentors):
        availability, first_overlap = _availability_overlap(learner.availability, mentor.availability)
        rating = ((mentor.rating_avg * mentor.rating_count) + (4.0 * 3)) / (mentor.rating_count + 3) / 5
        experience = min(mentor.experience_years / 10, 1.0)
        rating_weight = WEIGHTS["rating"] * min(mentor.rating_count / 10, 1.0)
        score_weights = {
            "skill": WEIGHTS["skill"] + WEIGHTS["rating"] - rating_weight,
            "goal": WEIGHTS["goal"],
            "availability": WEIGHTS["availability"],
            "rating": rating_weight,
            "experience": WEIGHTS["experience"],
        }
        breakdown = {
            "skill": float(skills[index]),
            "goal": float(goals[index]),
            "availability": availability,
            "rating": rating,
            "experience": experience,
        }
        score = sum(breakdown[key] * score_weights[key] for key in score_weights)
        over_budget = learner.budget_per_hour > 0 and mentor.price_per_hour > learner.budget_per_hour
        if over_budget:
            score *= 0.75

        ranked.append({
            "id": mentor.id,
            "score": round(score, 3),
            "breakdown": {key: round(value, 3) for key, value in breakdown.items()},
            "reasons": _reasons(learner, mentor, first_overlap, over_budget),
            "overBudget": over_budget,
            "_rating": mentor.rating_avg,
            "_experience": mentor.experience_years,
        })

    ranked.sort(key=lambda item: (item["score"], item["_rating"], item["_experience"]), reverse=True)
    return [{key: value for key, value in item.items() if not key.startswith("_")} for item in ranked[:limit]]