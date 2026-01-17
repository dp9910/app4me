# App4Me

App4Me is an intelligent app recommendation engine that uses AI to understand user intent and suggest the most relevant mobile applications. Unlike traditional keyword-based app store searches, App4Me analyzes complex problem statements (e.g., "I need to learn chemistry but I'm a visual learner") to effectuate a semantic search across multiple data sources.

## Key Features

- **Intent-Driven Search**: Utilizes Large Language Models (LLMs) to decompose user queries into core problems, solutions, and context.
- **Multi-Pipeline Architecture**:
    - **Scraping Pipeline**: Aggregates app data from iTunes, Apple RSS feeds, and SERP results.
    - **Reconciliation Engine**: Merges data from multiple sources to create a unified, high-quality app record.
    - **Semantic Search**: Uses vector embeddings (Supabase + pgvector) to find conceptually similar apps.
- **Contextual Analysis**: Provides transparent reasoning for why an app was recommended, including match quality and alignment with the user's specific constraints.
- **Swipe Interface**: A Tinder-like interface for users to quickly explore and curate their app choices.
- **Personalized Dashboard**: Users can save apps and receive tailored insights based on their interaction history.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/ML**: Google Gemini (Semantic Analysis & Embeddings), DeepSeek (Query Dissection)
- **Data Collections**: iTunes API, SerpAPI

## Getting Started

1.  **Environment Setup**:
    Copy `.env.example` to `.env.local` and configure your API keys (Supabase, Gemini, etc.).

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Project Structure

- `src/app`: Next.js application routes and API endpoints.
- `src/lib`: Core logic, including search pipelines, database clients, and AI services.
- `src/components`: Reusable UI components.
- `scripts`: Maintenance and data processing scripts.
- `sql`: Database schema and migration files.
- `docs`: Documentation on search algorithms and pipeline implementations.
