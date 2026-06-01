import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInitials } from "../utils/auth.js";
import {
  Trophy,
  Palette,
  Zap,
  Database,
  Paintbrush,
  Share2,
  Clock,
  Sparkles,
  Target,
  Lock,
  Heart,
  ArrowRight,
  Check,
  LogOut,
  LayoutDashboard,
  Menu,
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

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
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
                      {getInitials(user)}
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
                    <Menu size={26} strokeWidth={2} aria-hidden="true" />
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
