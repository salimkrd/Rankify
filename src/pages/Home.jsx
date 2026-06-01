import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  Palette,
  Zap,
  Database,
  Paintbrush,
  Share2,
  Clock,
  Sparkles,
  Users,
  Target,
  Lock,
  Heart,
  ArrowRight,
  Check,
  Download,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("rankify_is_logged_in") === "true";
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("rankify_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("rankify_is_logged_in");
    localStorage.removeItem("rankify_user");
    setIsLoggedIn(false);
    setUser(null);
    setIsDropdownOpen(false);
    navigate("/");
  };

  const handleDashboard = () => {
    setIsDropdownOpen(false);
    navigate("/dashboard");
  };

  // Demo state for "See It in Action"
  const [programData, setProgramData] = useState({
    template: "program-1",
    eventName: "Tech Summit 2026",
    category: "Web Development",
    winner: "Alice Johnson",
  });

  const [teamData, setTeamData] = useState({
    template: "team-1",
    eventName: "Sports Championship",
    team1: "Dragons",
    score1: 95,
    team2: "Phoenix",
    score2: 87,
  });

  const [framedData, setFramedData] = useState({
    template: "framed-1",
    title: "🎉 Congratulations!",
    name: "Bob Smith",
    achievement: "Champion of the Year",
  });

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  const handleDownload = (type) => {
    // Placeholder: In real app, would trigger actual download
    alert(`Download ${type} poster - coming soon!`);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pt-[72px]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[9999] bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Sparkles className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-gray-900 sm:text-2xl">PosterGen</span>
            </Link>

            {/* Right: User Menu */}
            <div className="flex items-center gap-4">
              {isLoggedIn && user ? (
                <div className="relative" ref={dropdownRef}>
                  {/* User Button */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <span className="hidden text-sm font-medium text-gray-900 sm:inline max-w-[120px] truncate">
                      {user.name}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-[10000]">
                      {/* My Account Label */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">My Account</p>
                      </div>

                      {/* Dashboard Link */}
                      <button
                        onClick={handleDashboard}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </button>

                      {/* Logout Link */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:inline"
                  >
                    Login
                  </Link>
                  <button
                    onClick={() => navigate("/register")}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Get Started
                  </button>
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="text-3xl text-gray-900 sm:hidden"
                    aria-label="Open menu"
                  >
                    ≡
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-white px-4 py-20 text-center sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-lg border border-green-200 bg-white/70 px-4 py-2 text-sm font-medium text-green-700 shadow-sm sm:mb-6 sm:rounded-full sm:bg-green-100 sm:py-1">
            <Sparkles className="h-4 w-4" />
            Organize Everything by Event!
          </div>

          <h1 className="mb-6 break-words text-[42px] font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Create Striking{" "}
            <span className="text-green-600">Result Posters.</span>
          </h1>

          <p className="mb-8 break-words text-3xl font-extrabold leading-tight text-gray-900 sm:mb-4 sm:text-2xl">
            Effortlessly. Instantly. Beautifully.
          </p>

          <p className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-gray-600 sm:text-lg">
            PosterGen is your ultimate platform for crafting professional posters
            for program winners and team standings. Convert data into captivating
            visuals with our intuitive, event-driven workflow.
          </p>

          <button
            onClick={handleGetStarted}
            className="inline-flex max-w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-green-700 hover:shadow-xl sm:text-lg"
          >
            {isLoggedIn ? "Go to Dashboard →" : "Get Started For Free →"}
            <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-4 text-sm text-gray-500">
            {isLoggedIn ? "No credit card required" : "No credit card required • Free forever to get started"}
          </p>
        </div>
      </section>

      {/* See It in Action Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              See It in Action
            </h2>
            <p className="text-lg text-gray-600">
              Try it out! Edit the data below and watch the posters update in real-time.
            </p>
          </div>

          <div className="grid gap-12 lg:gap-16">
            {/* Program Result Poster Demo */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="mb-6 text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                Program Result Poster Demo
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template
                    </label>
                    <select
                      value={programData.template}
                      onChange={(e) =>
                        setProgramData({ ...programData, template: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="program-1">Template 1 - Modern Blue</option>
                      <option value="program-2">Template 2 - Bold Green</option>
                      <option value="program-3">Template 3 - Minimalist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={programData.eventName}
                      onChange={(e) =>
                        setProgramData({ ...programData, eventName: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={programData.category}
                      onChange={(e) =>
                        setProgramData({ ...programData, category: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Winner
                    </label>
                    <input
                      type="text"
                      value={programData.winner}
                      onChange={(e) =>
                        setProgramData({ ...programData, winner: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white flex-1 flex items-center justify-center min-h-64">
                    <div className="text-center">
                      <Trophy className="h-16 w-16 mx-auto mb-4 opacity-80" />
                      <p className="text-sm opacity-75">{programData.eventName}</p>
                      <p className="text-2xl font-bold my-3">{programData.category}</p>
                      <p className="text-lg font-semibold">{programData.winner}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload("Program Result")}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Poster
                  </button>
                  <p className="mt-3 text-xs text-gray-500">
                    💡 Ready to share? Download and post on social media instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Standings Poster Demo */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="mb-6 text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Team Standings Poster Demo
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template
                    </label>
                    <select
                      value={teamData.template}
                      onChange={(e) =>
                        setTeamData({ ...teamData, template: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="team-1">Template 1 - Leaderboard</option>
                      <option value="team-2">Template 2 - Versus</option>
                      <option value="team-3">Template 3 - Rankings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={teamData.eventName}
                      onChange={(e) =>
                        setTeamData({ ...teamData, eventName: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team 1
                      </label>
                      <input
                        type="text"
                        value={teamData.team1}
                        onChange={(e) =>
                          setTeamData({ ...teamData, team1: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score
                      </label>
                      <input
                        type="number"
                        value={teamData.score1}
                        onChange={(e) =>
                          setTeamData({
                            ...teamData,
                            score1: parseInt(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team 2
                      </label>
                      <input
                        type="text"
                        value={teamData.team2}
                        onChange={(e) =>
                          setTeamData({ ...teamData, team2: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score
                      </label>
                      <input
                        type="number"
                        value={teamData.score2}
                        onChange={(e) =>
                          setTeamData({
                            ...teamData,
                            score2: parseInt(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-500 to-purple-600 p-8 text-white flex-1 flex items-center justify-center min-h-64">
                    <div className="w-full">
                      <p className="text-sm opacity-75 text-center mb-4">
                        {teamData.eventName}
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white bg-opacity-20 rounded px-3 py-2">
                          <span className="font-semibold">{teamData.team1}</span>
                          <span className="text-2xl font-bold">
                            {teamData.score1}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-white bg-opacity-20 rounded px-3 py-2">
                          <span className="font-semibold">{teamData.team2}</span>
                          <span className="text-2xl font-bold">
                            {teamData.score2}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload("Team Standings")}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Poster
                  </button>
                  <p className="mt-3 text-xs text-gray-500">
                    💡 Perfect for displaying live scores and final rankings!
                  </p>
                </div>
              </div>
            </div>

            {/* Framed Post Demo */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="mb-6 text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                Framed Post Demo
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template
                    </label>
                    <select
                      value={framedData.template}
                      onChange={(e) =>
                        setFramedData({ ...framedData, template: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="framed-1">Template 1 - Celebration</option>
                      <option value="framed-2">Template 2 - Elegant</option>
                      <option value="framed-3">Template 3 - Modern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={framedData.title}
                      onChange={(e) =>
                        setFramedData({ ...framedData, title: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={framedData.name}
                      onChange={(e) =>
                        setFramedData({ ...framedData, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Achievement
                    </label>
                    <input
                      type="text"
                      value={framedData.achievement}
                      onChange={(e) =>
                        setFramedData({ ...framedData, achievement: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col">
                  <div className="rounded-lg border-8 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 flex-1 flex items-center justify-center min-h-64">
                    <div className="text-center">
                      <p className="text-4xl mb-4">{framedData.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mb-3">
                        {framedData.name}
                      </p>
                      <p className="text-lg text-gray-600">{framedData.achievement}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload("Framed Post")}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Poster
                  </button>
                  <p className="mt-3 text-xs text-gray-500">
                    💡 Great for personalized achievement certificates and recognition posts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need, All in One Place
            </h2>
            <p className="text-lg text-gray-600">
              PosterGen simplifies poster creation with powerful, easy-to-use features.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: "Dual Poster Types",
                description:
                  "Create stunning Program Result Posters and Team Standings with dedicated templates.",
              },
              {
                icon: Paintbrush,
                title: "Visual Template Editor",
                description:
                  "Drag, drop, and customize every element. No design skills required.",
              },
              {
                icon: Zap,
                title: "Event-Centric Workflow",
                description:
                  "Organize everything around your events. Templates, data, and results in one place.",
              },
              {
                icon: Database,
                title: "Dynamic Data Integration",
                description:
                  "Seamlessly integrate winner data and team standings from your events.",
              },
              {
                icon: Palette,
                title: "Rich Customization",
                description:
                  "Personalize colors, fonts, layouts, and branding to match your event identity.",
              },
              {
                icon: Share2,
                title: "Instant Export & Sharing",
                description:
                  "Download posters as high-quality images and share instantly on social media.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get Stunning Posters in 4 Simple Steps
            </h2>
            <p className="text-lg text-gray-600">
              From setting up your event to sharing eye-catching results.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Setup Your Event",
                description: "Create a new event and give it a memorable name.",
              },
              {
                step: "2",
                title: "Design Templates",
                description: "Customize templates for your event's unique style.",
              },
              {
                step: "3",
                title: "Input Results Data",
                description: "Add winner data or team standings quickly and easily.",
              },
              {
                step: "4",
                title: "Generate & Share",
                description: "Create and download posters, then share on social media.",
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                {/* Connector line */}
                {idx < 3 && (
                  <div className="hidden absolute top-8 left-1/2 w-full h-1 bg-gradient-to-r from-green-600 to-green-200 lg:block transform -translate-x-1/2 translate-y-0"></div>
                )}

                <div className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4 h-16 w-16 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Unlock the Power of Visual Results
            </h2>
            <p className="text-lg text-gray-600">
              PosterGen offers tangible benefits for any event organizer.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Save Countless Hours",
              "Professional Look, Zero Hassle",
              "Boost Audience Engagement",
              "No Design Degree Required",
              "Perfect for Any Event Type",
              "Centralized & Organized",
              "Consistent Branding",
              "Mobile-Friendly Access",
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="rounded-full border border-green-200 bg-green-50 px-6 py-3 inline-flex items-center gap-2"
              >
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-700 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Elevate Your Event Announcements?
          </h2>
          <p className="text-lg text-green-50 mb-10 max-w-2xl mx-auto">
            Join PosterGen today and start creating result posters that captivate and
            celebrate. It's free to get started, and powerful enough to grow with you.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-semibold text-green-600 hover:bg-green-50 transition-colors shadow-lg hover:shadow-xl"
          >
            {isLoggedIn ? "Back to My Dashboard" : "Sign Up & Start Creating"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-green-600" />
              <span className="text-lg font-bold text-gray-900">PosterGen</span>
            </div>

            <div className="text-sm text-gray-600 flex items-center gap-2">
              © 2026 PosterGen. All rights reserved.
            </div>

            <div className="text-sm text-gray-600">
              by salimkrd.com
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
