## CODYX 

**Collaborative Data Science Notebooks in Your Browser**

CODYX is a browser-based collaborative notebook platform that lets you execute Python and R code seamlessly, interleaved with markdown documentation. Share analyses instantly with a simple URL - perfect for classrooms, research, and team collaboration.YRN 

**Collaborative Data Science Notebooks • No Logins Required**

Codyx is a browser-based collaborative notebook platform that lets you execute Python and R code seamlessly, interleaved with markdown documentation. Share analyses instantly with a simple URL - perfect for classrooms, research, and team collaboration.

## ✨ Features

- **Python Support** - Full Pyodide integration with popular data science libraries
- **R Support** - Complete WebR environment with ggplot2 and tidyverse packages  
- **Real-time Collaboration** - Multiple users can edit simultaneously with live updates
- **Browser-based** - No installation required, runs entirely in your browser
- **Easy Sharing** - Share notebooks with a simple URL
- **Rich Markdown** - Full markdown support for documentation and analysis

## 🚀 Quick Start

Visit the live platform: codyx.app

1. Click "New Notebook" to create a notebook with a unique URL
2. Add cells with Markdown, Python, or R code
3. Execute code directly in your browser
4. Share the URL with collaborators

## 🛠️ Installation & Development

### Prerequisites
- Node.js 18+ 
- A Supabase account and database
- Git

### Setup Instructions

1. **Clone the repository**
   ```sh
   git clone https://github.com/your-username/codyx.git
   cd codyx
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure environment**
   ```sh
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your Supabase credentials
   # VITE_SUPABASE_URL=your_supabase_url
   # VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Initialize database**
   Execute the contents of init.sql in your Supabase SQL editor


5. **Start development server**
   ```sh
   npm run dev
   ```

6. **Open your browser**
   ```
   Navigate to http://localhost:5173
   ```

## 📖 Documentation

Comprehensive API documentation is available and auto-generated from source code:

```bash
# Generate and serve interactive documentation
npm run docs         # Generate with DocumentationJS  
npm run docs:serve   # Serve on http://localhost:8080
```

- **📱 Interactive HTML**: Modern single-page documentation with smooth navigation
- **📝 GitHub Markdown**: Perfect for repository documentation at `docs/reference/notebook/README.md`
- **🔧 JSON API**: Structured data for integrations

All classes include comprehensive JSDoc with examples, parameters, and usage patterns.

### Database Schema

The `init.sql` file contains the complete database schema including:
- `notebooks` table for storing notebook metadata
- `cells` table for individual notebook cells
- Real-time subscriptions for live collaboration
- Row Level Security (RLS) policies

## Architecture

- **Frontend**: SvelteKit with modern JavaScript/TypeScript
- **Python Execution**: Pyodide (browser-based Python interpreter)
- **R Execution**: WebR (browser-based R interpreter) 
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Styling**: Custom CSS with responsive design
- **Fonts**: Orbitron (headings), Raleway (body), Bowlby One (R symbols)

## 📚 Documentation

Detailed component documentation is available in the `docs/` directory:

- **[CodyxCell Component Documentation](docs/CodyxCell-Component-Documentation.md)** - Comprehensive documentation of the core cell component, including:
  - Component architecture with mermaid class diagrams
  - Props, state, and methods reference
  - Event handling and lifecycle
  - Real-time collaboration flow
  - Usage examples and best practices

## Building for Production

```sh
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Pyodide** - Python in the browser
- **WebR** - R in the browser  
- **Supabase** - Backend infrastructure and real-time features
- **SvelteKit** - Modern web framework
- **Material Symbols** - Beautiful icons

---

**Built with ❤️ for the data science community**
