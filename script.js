class HangmanGame {
    constructor() {
        this.SHEET_ID = '1Uvulpvse84w7CFHxhr2cYUZ0XMrHofsrlRgPvsUA_r4';
        this.API_KEY = ''; // Se puede usar sin API key para sheets públicas
        this.words = [];
        this.currentWord = '';
        this.guessedWord = [];
        this.wrongGuesses = [];
        this.attemptsLeft = 6;
        this.score = 0;
        this.hintUsed = false;
        this.gameWon = false;
        this.gameOver = false;
        
        this.hangmanParts = [
            '',
            '  +---+\n      |\n      |\n      |\n      |\n      |\n=========',
            '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========',
            '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========='
        ];
        
        this.difficultyPoints = {
            'facil': 10,
            'medio': 20,
            'dificil': 30,
            'pro': 50,
            'dios': 75,
            'imposible': 100
        };
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        await this.loadWordsFromSheet();
        this.setupEventListeners();
        this.showLoading(false);
    }

    async loadWordsFromSheet() {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json`;
            const response = await fetch(url);
            const text = await response.text();
            
            // Procesar la respuesta de Google Sheets
            const jsonString = text.substring(47).slice(0, -2);
            const data = JSON.parse(jsonString);
            
            this.words = [];
            
            if (data.table && data.table.rows) {
                for (let i = 0; i < data.table.rows.length; i++) {
                    const row = data.table.rows[i];
                    if (row.c && row.c[0] && row.c[0].v) {
                        const word = {
                            palabra: (row.c[0] ? row.c[0].v : '').toString().trim(),
                            categoria: (row.c[1] ? row.c[1].v : 'general').toString().trim().toLowerCase(),
                            dificultad: (row.c[2] ? row.c[2].v : 'medio').toString().trim().toLowerCase(),
                            pista: (row.c[3] ? row.c[3].v : 'Sin pista disponible').toString().trim(),
                            idioma: (row.c[4] ? row.c[4].v : 'español').toString().trim().toLowerCase()
                        };
                        
                        // Solo agregar si la palabra no está vacía
                        if (word.palabra.length > 0) {
                            this.words.push(word);
                        }
                    }
                }
            }
            
            if (this.words.length === 0) {
                throw new Error('No se encontraron palabras en la hoja');
            }
            
            this.populateSelectors();
            this.hideError();
            
        } catch (error) {
            console.error('Error al cargar palabras:', error);
            this.showError('Error al conectar con Google Sheets. Usando palabras de ejemplo.');
            this.loadFallbackWords();
        }
    }

    loadFallbackWords() {
        this.words = [
            { palabra: 'gato', categoria: 'animales', dificultad: 'facil', pista: 'Mascota que maulla', idioma: 'español' },
            { palabra: 'perro', categoria: 'animales', dificultad: 'facil', pista: 'Mejor amigo del hombre', idioma: 'español' },
            { palabra: 'elefante', categoria: 'animales', dificultad: 'medio', pista: 'Animal grande con trompa', idioma: 'español' },
            { palabra: 'computadora', categoria: 'tecnologia', dificultad: 'dificil', pista: 'Dispositivo para procesar información', idioma: 'español' },
            { palabra: 'programacion', categoria: 'tecnologia', dificultad: 'pro', pista: 'Arte de crear software', idioma: 'español' },
            { palabra: 'cat', categoria: 'animales', dificultad: 'facil', pista: 'Pet that meows', idioma: 'ingles' },
            { palabra: 'computer', categoria: 'tecnologia', dificultad: 'medio', pista: 'Electronic device', idioma: 'ingles' }
        ];
        this.populateSelectors();
    }

    populateSelectors() {
        const categories = [...new Set(this.words.map(w => w.categoria))].filter(cat => cat && cat.length > 0);
        const languages = [...new Set(this.words.map(w => w.idioma))].filter(lang => lang && lang.length > 0);
        
        const categorySelect = document.getElementById('categorySelect');
        const languageSelect = document.getElementById('languageSelect');
        
        categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categorySelect.appendChild(option);
        });
        
        languageSelect.innerHTML = '<option value="">Todos los idiomas</option>';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
            languageSelect.appendChild(option);
        });
        
        console.log('Categorías disponibles:', categories);
        console.log('Idiomas disponibles:', languages);
        console.log('Total de palabras cargadas:', this.words.length);
    }

    setupEventListeners() {
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('newGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());
    }

    startGame() {
        const category = document.getElementById('categorySelect').value;
        const difficulty = document.getElementById('difficultySelect').value;
        const language = document.getElementById('languageSelect').value;
        
        if (!difficulty) {
            alert('Por favor selecciona una dificultad');
            return;
        }
        
        let filteredWords = this.words.filter(w => w.dificultad && w.dificultad.toLowerCase().trim() === difficulty.toLowerCase().trim());
        
        if (category) {
            filteredWords = filteredWords.filter(w => w.categoria && w.categoria.toLowerCase().trim() === category.toLowerCase().trim());
        }
        
        if (language) {
            filteredWords = filteredWords.filter(w => w.idioma && w.idioma.toLowerCase().trim() === language.toLowerCase().trim());
        }
        
        console.log('Palabras filtradas:', filteredWords.length);
        console.log('Filtros aplicados:', { category, difficulty, language });
        
        if (filteredWords.length === 0) {
            alert(`No se encontraron palabras con los filtros seleccionados.\nCategoría: ${category || 'Todas'}\nDificultad: ${difficulty}\nIdioma: ${language || 'Todos'}`);
            return;
        }
        
        const randomWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
        this.currentWord = randomWord;
        this.normalizedWord = this.normalizeText(randomWord.palabra);
        this.guessedWord = new Array(randomWord.palabra.length).fill('_');
        this.wrongGuesses = [];
        this.attemptsLeft = 6;
        this.hintUsed = false;
        this.gameWon = false;
        this.gameOver = false;
        
        this.updateDisplay();
        this.createAlphabet();
        
        document.getElementById('setup').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
    }

    createAlphabet() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const alphabetDiv = document.getElementById('alphabet');
        alphabetDiv.innerHTML = '';
        
        for (let letter of alphabet) {
            const button = document.createElement('button');
            button.className = 'letter-btn';
            button.textContent = letter;
            button.addEventListener('click', () => this.guessLetter(letter.toLowerCase()));
            alphabetDiv.appendChild(button);
        }
    }

    // Función para normalizar texto (quitar tildes y convertir a mayúsculas)
    normalizeText(text) {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
    }

    guessLetter(letter) {
        if (this.gameOver) return;
        
        const buttons = document.querySelectorAll('.letter-btn');
        let targetButton = null;
        
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase() === letter) {
                targetButton = btn;
            }
        });
        
        if (!targetButton || targetButton.disabled) return;
        
        targetButton.disabled = true;
        
        const normalizedGuessLetter = this.normalizeText(letter);
        let found = false;
        
        for (let i = 0; i < this.currentWord.palabra.length; i++) {
            const normalizedWordLetter = this.normalizeText(this.currentWord.palabra[i]);
            if (normalizedWordLetter === normalizedGuessLetter) {
                this.guessedWord[i] = this.currentWord.palabra[i];
                found = true;
            }
        }
        
        if (found) {
            targetButton.classList.add('correct');
            if (!this.guessedWord.includes('_')) {
                this.gameWon = true;
                this.gameOver = true;
                this.calculateScore();
                this.showGameOver();
            }
        } else {
            targetButton.classList.add('incorrect');
            this.wrongGuesses.push(letter);
            this.attemptsLeft--;
            
            if (this.attemptsLeft <= 0) {
                this.gameOver = true;
                this.showGameOver();
            }
        }
        
        this.updateDisplay();
    }

    calculateScore() {
        if (this.gameWon) {
            let points = this.difficultyPoints[this.currentWord.dificultad] || 20;
            if (!this.hintUsed) points += 10;
            points += this.attemptsLeft * 5;
            this.score += points;
        }
    }

    showHint() {
        if (this.hintUsed) return;
        
        document.getElementById('hintText').textContent = this.currentWord.pista;
        document.getElementById('hintText').style.display = 'block';
        document.getElementById('hintBtn').style.display = 'none';
        this.hintUsed = true;
    }

    updateDisplay() {
        document.getElementById('currentCategory').textContent = this.currentWord.categoria;
        document.getElementById('currentDifficulty').textContent = this.currentWord.dificultad;
        document.getElementById('attemptsLeft').textContent = this.attemptsLeft;
        document.getElementById('score').textContent = this.score;
        document.getElementById('wordDisplay').textContent = this.guessedWord.join(' ');
        document.getElementById('hangmanDisplay').textContent = this.hangmanParts[6 - this.attemptsLeft];
    }

    showGameOver() {
        const gameOverDiv = document.getElementById('gameOver');
        
        if (this.gameWon) {
            gameOverDiv.className = 'game-over win';
            gameOverDiv.innerHTML = `
                🎉 ¡FELICIDADES! 🎉<br>
                ¡Has ganado!<br>
                La palabra era: <strong>${this.currentWord.palabra}</strong>
            `;
        } else {
            gameOverDiv.className = 'game-over lose';
            gameOverDiv.innerHTML = `
                💀 ¡GAME OVER! 💀<br>
                La palabra era: <strong>${this.currentWord.palabra}</strong><br>
                ¡Inténtalo de nuevo!
            `;
        }
        
        gameOverDiv.style.display = 'block';
        document.getElementById('newGameBtn').style.display = 'inline-block';
        document.getElementById('hintText').style.display = 'none';
        document.getElementById('hintBtn').style.display = 'inline-block';
    }

    backToMenu() {
        document.getElementById('setup').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('newGameBtn').style.display = 'none';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }
}

// Inicializar el juego cuando se carga la página
window.addEventListener('DOMContentLoaded', () => {
    new HangmanGame();
});