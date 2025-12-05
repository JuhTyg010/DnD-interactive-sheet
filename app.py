import webview  # <--- NEW IMPORT
from flask import Flask, render_template, request, jsonify
import json
import math
import random
import requests
import sys

app = Flask(__name__)
DATA_FILE = 'character.json'

# --- RULES CONSTANTS ---
SKILL_MAP = {
    'str': ['athletics'],
    'dex': ['acrobatics', 'sleight_of_hand', 'stealth'],
    'int': ['arcana', 'history', 'investigation', 'nature', 'religion'],
    'wis': ['animal_handling', 'insight', 'medicine', 'perception', 'survival'],
    'cha': ['deception', 'intimidation', 'performance', 'persuasion']
}

def load_data():
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def calculate_sheet(data):
    """Enriches the raw JSON with calculated modifiers and bonuses."""
    
    # 1. Calculate Proficiency Bonus (PB) based on Level
    lvl = data.get('level', 1)
    pb = math.ceil(lvl / 4) + 1
    data['derived_pb'] = pb

    # 2. Calculate Attribute Modifiers
    stats = data.get('stats', {})
    modifiers = {}
    for stat, score in stats.items():
        modifiers[stat] = (score - 10) // 2
    data['derived_modifiers'] = modifiers

    # 3. Calculate Skill Bonuses
    skills_output = {}
    raw_skills = data.get('skills', {})
    
    for stat, skill_list in SKILL_MAP.items():
        stat_mod = modifiers.get(stat, 0)
        for skill_name in skill_list:
            prof_level = raw_skills.get(skill_name, 0) # 0=None, 1=Prof, 2=Exp
            
            bonus = stat_mod + (pb * prof_level)
            
            skills_output[skill_name] = {
                "stat": stat,
                "prof_level": prof_level,
                "bonus": bonus,
                "pretty_name": skill_name.replace('_', ' ').title()
            }
            
    data['calculated_skills'] = skills_output

    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/character', methods=['GET', 'POST'])
def character_api():
    if request.method == 'POST':
        new_data = request.json
        clean_data = {k: v for k, v in new_data.items() if k not in ['derived_pb', 'derived_modifiers', 'calculated_skills']}
        save_data(clean_data)
        return jsonify({"status": "saved"})
    
    raw_data = load_data()
    enriched_data = calculate_sheet(raw_data)
    return jsonify(enriched_data)

@app.route('/api/roll', methods=['POST'])
def roll():
    req = request.json
    bonus = req.get('bonus', 0)
    label = req.get('label', 'Roll')
    
    d20 = random.randint(1, 20)
    total = d20 + bonus
    
    return jsonify({
        "d20": d20,
        "total": total,
        "label": label,
        "crit": d20 == 20,
        "fail": d20 == 1
    })

@app.route('/api/check-wikidot', methods=['POST'])
def check_wikidot():
    data = request.get_json()
    target_url = data.get('url')

    if not target_url:
        return jsonify({'exists': False, 'error': 'No URL provided'})

    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(target_url, headers=headers, timeout=5)

        if response.status_code == 404:
            return jsonify({'exists': False})

        page_content = response.text
        if "This page does not exist yet" in page_content:
            return jsonify({'exists': False})

        return jsonify({'exists': True})

    except Exception as e:
        print(f"Check failed: {e}")
        return jsonify({'exists': False})

# --- MODIFIED STARTUP LOGIC ---
if __name__ == '__main__':
    # We create the window object
    # We pass 'app' (the Flask object) as the URL. Pywebview handles the port.
    window = webview.create_window(
        "D&D Character Sheet", 
        app,
        width=1100,
        height=900,
        resizable=True
    )

    # We start the GUI. 
    # This blocks the code here until the window is closed.
    # Once closed, it automatically kills the Flask server and exits.
    webview.start()