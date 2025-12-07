# Interactive D&D Character Sheet (2024 Edition)

A lightweight, local, and interactive character sheet designed for Dungeons & Dragons (specifically aligned with 2024 rulesets). This application runs as a desktop window using Python and Flask, providing automatic calculations, spell management, and instant references to external wikis.

## 📖 About The Project

This project replaces static PDF sheets with a dynamic, local application. Instead of manually erasing and rewriting HP or recalculating skill bonuses every time an attribute changes, this application handles the math for you.

It uses **Python (Flask)** for the backend logic and data persistence, and **HTML/CSS/JS** for the frontend interface. The application wraps the web interface into a native-looking desktop window using `pywebview`.

## ✨ Features & Capabilities

The sheet is designed to streamline gameplay by automating the "crunchy" parts of D&D:

* **Auto-Calculations**:
    * Derives **Attribute Modifiers** and **Proficiency Bonus** automatically based on level and stats.
    * Calculates **Skill Bonuses** instantly.
* **Smart Spellcasting**:
    * Track **Spell Slots** via interactive bubbles.
    * **Wikidot Integration**: The app automatically checks the [DnD 2024 Wikidot](http://dnd2024.wikidot.com/) for spells and feats. If a matching entry is found, the name becomes a direct link to the rules.
* **Interactive HUD**:
    * Manage HP, Death Saves, and Hit Dice in real-time.
    * **Dice Rolling**: Click to roll for Skills, Saves, and Attacks with an integrated log.
* **Inventory & Attunement**:
    * Track equipment and magic items.
    * Visual indicators for attunement slots (3 max).
* **Persistence**:
    * All data is saved locally to `character.json` instantly upon change.

## 🛠️ Installation & Usage

### Prerequisites
You need **Python 3.x** installed on your machine.

### 1. Download the Project
Clone this repository or download the ZIP file and extract it.

### 2. Install Dependencies
Install the required Python libraries.

```
pip install flask pywebview requests
```

### 3. Run the Application
Execute the main script to launch the character sheet window.

```
python app.py
```


## 📂 Project Structure

* **`app.py`**: Main entry point. Handles the Flask server, API routes (`/api/character`, `/api/roll`), and window creation.
* **`character.json`**: Stores all character data.
* **`static/`**: Contains `js/` for logic (State, Renderer, API) and `css/` for styling.
* **`templates/`**: HTML structure for the dashboard and dialogs.

## 📝 Customization

Because the data is stored in `character.json`, you can manually back up your character or edit the file directly for bulk changes.

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests for new features, such as expanded 2024 rule support or new UI themes.