# App4Me - Personalized App Discovery

Discover apps tailored to your unique lifestyle and goals. Built with Next.js 14, Supabase, and Google Gemini AI.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Google AI Studio account for Gemini API (optional for testing)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd app4me
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your API keys:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   
   # Google AI (Gemini) - Optional for testing
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Set up Supabase database**
   
   In your Supabase dashboard, go to SQL Editor and run:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Then: `supabase/migrations/002_seed_data.sql`

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## 🎯 How It Works

1. **Personalization Quiz**: Users answer questions about their lifestyle and goals
2. **AI-Powered Search**: Gemini AI analyzes user intent and finds relevant apps
3. **Smart Recommendations**: Apps are ranked and personalized with custom one-liners
4. **Frictionless Discovery**: No signup required for initial search

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase PostgreSQL
- **AI**: Google Gemini (text generation + embeddings)
- **Icons**: Lucide React
- **Hosting**: Vercel (recommended)

## 📁 Project Structure

```
app4me/
├── src/
│   ├── app/
│   │   ├── api/search/          # Search API endpoint
│   │   ├── discover/            # Results page
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/ui/           # Reusable components
│   └── lib/supabase/           # Database client
├── supabase/migrations/         # Database schema
├── .env.local                  # Environment variables
└── README.md
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

2. **Set environment variables in Vercel dashboard**
   - All variables from `.env.local`

3. **Add custom domain** (optional)
   - Configure in Vercel dashboard

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `GEMINI_API_KEY` | Google AI API key | ⚠️ Optional* |

*Without Gemini API, the app will use basic keyword matching instead of AI-powered search.

## 🧪 Testing

```bash
# Build test
npm run build

# Type checking
npm run lint

# Start production server
npm run start
```

## 🔧 Development

### Adding New Features

1. **Database changes**: Add new migration in `supabase/migrations/`
2. **API endpoints**: Create in `src/app/api/`
3. **UI components**: Add to `src/components/ui/`
4. **Types**: Update in `src/lib/supabase/client.ts`

### Database Schema

The app uses these main tables:
- `apps` - App metadata and details
- `app_ai_insights` - AI-generated descriptions and tags
- `app_embeddings` - Vector embeddings for semantic search
- `user_profiles` - User preferences (future)
- `search_logs` - Analytics data

## 📊 Features

- ✅ Personalized quiz flow
- ✅ AI-powered app search
- ✅ Responsive design
- ✅ Mock data for testing
- ⏳ User accounts (future)
- ⏳ App store integration (future)
- ⏳ Real app data collection (future)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using [Claude Code](https://claude.ai/code)**