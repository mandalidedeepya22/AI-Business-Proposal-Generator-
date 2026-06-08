def generate_sow(requirements):
    prompt = f"""Create Statement of Work for: {requirements['description']}
    Include: scope, deliverables, milestones, acceptance criteria"""
    return llm.predict(prompt)

def estimate_pricing(requirements):
    prompt = f"""Estimate pricing for: {requirements}
    Break down by: development hours, testing, infrastructure, professional fees"""
    return llm.predict(prompt)

def plan_timeline(requirements):
    prompt = f"""Create timeline for: {requirements}
    Include: phases, duration, critical milestones, dependencies"""
    return llm.predict(prompt)