# Elementary Quiz Generator API

Backend API for Elementary English Quiz & Crossword Generator using a Fine-tuned T5 Model, specifically designed for Grade 3–4 students.

## Features

- **Crossword Puzzle Generation**: Generate interactive crosswords from reading passages.
- **Multiple Choice Quiz (MCQ)**: Create MCQ tests with automatic grading.
- **T5-Based Question Generation**: Uses a fine-tuned T5 model to generate high-quality questions.
- **Target Audience**: Tailored for English learning at the elementary level (Grade 3–4).
- **Leaderboard System**: Track student progress and completion times.
- **Real-time Database**: MySQL integration ensures persistent storage of quiz and leaderboard data.

## Architecture

This backend is part of a split deployment system:

- **Backend API (this repo)**: Deployed on [Railway](https://railway.app)
- **Frontend**: Deployed separately using [Vercel](https://vercel.com)
- **Machine Learning Model**: Hosted on [Hugging Face Spaces](https://huggingface.co/spaces)

## API Endpoints

### Health & Info

- `GET /health` – Health check for API status
- `GET /` – Basic API information

### Crossword Management

- `POST /display_question_answer` – Save crossword data
- `GET /check-key/:key` – Retrieve crossword by key
- `GET /leaderboard/:key` – Retrieve leaderboard for a specific crossword

### MCQ Management

- `POST /export_mcq_data` – Save MCQ data
- `GET /check-mcq/:key` – Retrieve MCQ data by key
- `GET /leaderboard-mcq/:key` – Retrieve leaderboard for a specific MCQ

### Student Management

- `POST /save-name` – Register student name for crossword tracking
- `POST /save-mcq-name` – Register student name for MCQ tracking
- `POST /update-is-done` – Update crossword completion status
- `POST /update-mcq-result` – Update MCQ score and completion status

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Deployment**: Railway (Backend), Vercel (Frontend), Hugging Face Spaces (ML Model)
- **CORS**: Enabled and configured for cross-origin requests

---

Feel free to contribute or raise an issue for improvements!