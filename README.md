# Smart-bookmark

Project Overview
Smart Bookmark is an educational web app designed to enhance children's reading experiences.
It allows users to upload a photo of a book, automatically extract text, identify the book title and chapter, and generate classroom-friendly educational content using AI.

The app supports both English and Spanish, allows students to listen to content read aloud, and includes a feature to create a custom "Book Buddy" avatar.

Tech Stack
Frontend: HTML, CSS, JavaScript

Backend: Python (Flask)

AI API: OpenAI

OCR: Tesseract.js

Storage: Browser localStorage

Optional Analytics: Supabase

How It Works
The user uploads an image of a book cover or page.

Tesseract.js extracts text from the image.

The app identifies a likely book title and chapter.

The app uses OpenAI to generate educational content.

The user can navigate through different sections such as About the Book, Vocabulary, Fun Facts, Discussion Questions, and Similar Titles.

The user can also listen to the content using text-to-speech and create a "Book Buddy" avatar.

Project Structure
/ (project root)
├── app.py                 # Flask server
├── templates/
│   ├── base.html          # Main HTML layout
│   ├── index.html         # Home page
│   ├── about.html         # About the Book page
│   ├── fun_facts.html     # Fun Facts page
│   ├── vocab.html         # Vocabulary page
│   ├── discussion.html    # Discussion Questions page
│   ├── avatar.html        # Create Book Buddy page
│   ├── similar_titles.html# Similar Titles page
├── static/
│   ├── css/
│   │   └── styles.css     # Styling
│   ├── js/
│   │   └── main.js        # JavaScript logic
└── README.md              # Project documentation

