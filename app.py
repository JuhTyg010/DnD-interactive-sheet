import webview
from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import math
import random
import requests
import os

app = Flask(__name__)

CONFIG_FILE = 'launcher_config.json'

DEFAULT_CHAR_TEMPLATE = {
    "name": "New Hero",
    "class": "Warlock",
    "level": 1,
    "stats": {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
    "skills": {},
    "hp_current": 10,
    "hp_max": 10,
    "inventory": [],
    "spells": [],
    "weapons": []
}

active_char_path = None
window = None  # Global window reference

SKILL_MAP = {
    'str': ['athletics'],
    'dex': ['acrobatics', 'sleight_of_hand', 'stealth'],
    'int': ['arcana', 'history', 'investigation', 'nature', 'religion'],
    'wis': ['animal_handling', 'insight', 'medicine', 'perception', 'survival'],
    'cha': ['deception', 'intimidation', 'performance', 'persuasion']
}

def load_launcher_config():
    if not os.path.exists(CONFIG_FILE):
        return []
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_launcher_config(char_list):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(char_list, f, indent=4)

def load_data():
    global active_char_path
    if not active_char_path or not os.path.exists(active_char_path):
        return {}
    try:
        with open(active_char_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading character: {e}")
        return {}

def save_data(data):
    global active_char_path
    if active_char_path:
        with open(active_char_path, 'w') as f:
            json.dump(data, f, indent=4)

def calculate_sheet(data):
    lvl = data.get('level', 1)
    pb = math.ceil(lvl / 4) + 1
    data['derived_pb'] = pb

    stats = data.get('stats', {})
    modifiers = {}
    for stat, score in stats.items():
        modifiers[stat] = (score - 10) // 2
    data['derived_modifiers'] = modifiers

    skills_output = {}
    raw_skills = data.get('skills', {})
    
    for stat, skill_list in SKILL_MAP.items():
        stat_mod = modifiers.get(stat, 0)
        for skill_name in skill_list:
            prof_level = raw_skills.get(skill_name, 0)
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
def launcher():
    return render_template('launcher.html')

@app.route('/sheet')
def sheet_view():
    if not active_char_path:
        return redirect(url_for('launcher'))
    return render_template('index.html')


@app.route('/api/launcher/list', methods=['GET'])
def get_char_list():
    chars = load_launcher_config()
    valid_chars = [c for c in chars if os.path.exists(c['path'])]
    if len(valid_chars) != len(chars):
        save_launcher_config(valid_chars)
    return jsonify(valid_chars)

@app.route('/api/launcher/select', methods=['POST'])
def select_char():
    global active_char_path
    data = request.json
    path = data.get('path')
    if path and os.path.exists(path):
        active_char_path = path
        return jsonify({"status": "ok"})
    return jsonify({"status": "error", "message": "File not found"}), 404

@app.route('/api/launcher/browse-save', methods=['GET'])
def browse_save():
    file_types = ('JSON Files (*.json)', 'All files (*.*)')
    result = window.create_file_dialog(webview.FileDialog.SAVE, save_filename='character.json', file_types=file_types)
    return jsonify({"path": result})

@app.route('/api/launcher/create', methods=['POST'])
def create_char():
    global active_char_path
    data = request.json
    name = data.get('name')
    path = data.get('path')
    
    if not path:
        return jsonify({"status": "error", "error": "No file path provided"}), 400

    if not path.endswith('.json'):
        path += '.json'
        
    if os.path.exists(path):
        return jsonify({"status": "error", "error": "File already exists"}), 400
        
    new_char = DEFAULT_CHAR_TEMPLATE.copy()
    new_char['name'] = name
    
    try:
        with open(path, 'w') as f:
            json.dump(new_char, f, indent=4)
            
        config = load_launcher_config()
        config.append({"name": name, "path": path})
        save_launcher_config(config)
        
        active_char_path = path
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/launcher/import', methods=['GET'])
def import_char():
    file_types = ('JSON Files (*.json)', 'All files (*.*)')
    result = window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types)
    
    if result and len(result) > 0:
        path = result[0]
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                name = data.get('name', 'Unknown')
                
            config = load_launcher_config()
            # Avoid duplicates
            if not any(c['path'] == path for c in config):
                config.append({"name": name, "path": path})
                save_launcher_config(config)
            
            return jsonify({"status": "ok"})
        except Exception as e:
            return jsonify({"status": "error", "error": str(e)})
            
    return jsonify({"status": "cancel"})

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
    return jsonify({ "d20": d20, "total": total, "label": label, "crit": d20 == 20, "fail": d20 == 1 })

@app.route('/api/check-wikidot', methods=['POST'])
def check_wikidot():
    data = request.get_json()
    target_url = data.get('url')
    if not target_url: return jsonify({'exists': False})
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(target_url, headers=headers, timeout=5)
        if response.status_code == 404 or "This page does not exist yet" in response.text:
            return jsonify({'exists': False})
        return jsonify({'exists': True})
    except:
        return jsonify({'exists': False})

if __name__ == '__main__':
    window = webview.create_window(
        "D&D Character Manager", 
        app, 
        width=950, 
        height=1000, 
        resizable=True)
    webview.start()