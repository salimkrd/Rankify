import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInitials } from "../utils/auth.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import logoDark from "../assets/logo/rankify-logo-dark.svg";
import logoLight from "../assets/logo/rankify-logo-light.svg";
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

  useEffect(() => {
    const root = document.documentElement;

    if (!isLoggedIn) {
      root.classList.remove("dark");
      root.dataset.theme = "light";
      return;
    }

    const storedTheme = localStorage.getItem("rankify-theme");
    const theme = storedTheme === "dark" ? "dark" : "light";
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
  }, [isLoggedIn]);

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
    <div className={`${!isLoggedIn ? "force-light-page " : ""}min-h-screen overflow-x-hidden bg-[#F8FAFC] pt-[76px] font-sans dark:bg-[#07111F] sm:pt-[104px]`}>
      {/* Navbar */}
      <nav className="fixed left-0 right-0 top-0 z-[9999] border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0D1B2A]/95">
        <div className="mx-auto max-w-none px-4 sm:px-10 lg:px-14">
          <div className="flex h-[76px] items-center justify-between sm:h-[104px]">
            {/* Left: Logo */}
            <Link to="/" className="flex min-w-0 shrink items-center gap-3 transition-opacity hover:opacity-85">
              <img
                src={logoLight}
                alt="Rankify"
                className="h-8 w-auto max-w-[132px] object-contain dark:hidden sm:h-[38px] sm:max-w-none md:h-[44px]"
              />
              <img
                src={logoDark}
                alt="Rankify"
                className="hidden h-8 w-auto max-w-[132px] object-contain dark:block sm:h-[38px] sm:max-w-none md:h-[44px]"
              />
            </Link>

            {/* Right: User Menu */}
            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
              {isLoggedIn && user ? (
                <div className="relative" ref={dropdownRef}>
                  {/* User Button */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex max-w-[calc(100vw-180px)] cursor-pointer items-center gap-2 rounded-full px-1.5 py-2 text-[#0D1B2A] transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-white/10 sm:max-w-none sm:gap-3 sm:px-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-white sm:h-12 sm:w-12 sm:text-base">
                      {getInitials(user)}
                    </div>
                    <span className="hidden min-w-0 max-w-[190px] truncate text-base font-semibold sm:inline lg:text-xl">
                      {user.name}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 z-[10000] mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#132D46]">
                      {/* My Account Label */}
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                        <p className="text-sm font-semibold text-[#0D1B2A] dark:text-white">My Account</p>
                      </div>

                      {/* Dashboard Link */}
                      <button
                        onClick={handleDashboard}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </button>

                      <div className="border-t border-slate-100 px-4 py-3 dark:border-white/10">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Theme
                        </p>
                        <ThemeToggle className="w-full" />
                      </div>

                      {/* Logout Link */}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-white/10 dark:text-red-300 dark:hover:bg-red-500/10"
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
                    className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-[#0D1B2A] dark:text-slate-300 dark:hover:text-white sm:inline"
                  >
                    Login
                  </Link>
                  <button
                    onClick={() => navigate("/register")}
                    className="rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:px-4"
                  >
                    Get Started
                  </button>
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="text-3xl text-[#0D1B2A] dark:text-white sm:hidden"
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
      <section className="relative isolate flex min-h-[calc(100vh-76px)] items-center overflow-hidden bg-[#F8FAFC] px-4 py-12 text-center dark:bg-[#07111F] sm:min-h-[calc(100vh-104px)] sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_18%,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#ffffff_0%,#F8FAFC_68%,#EFF6FF_100%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(37,99,235,0.22),transparent_34%),linear-gradient(180deg,#07111F_0%,#06101D_58%,#0B3A91_130%)]" />
        <div
          className="pointer-events-none absolute left-8 top-24 -z-10 hidden h-52 w-64 opacity-60 dark:opacity-70 lg:block"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(37,99,235,0.22) 2px, transparent 2.5px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
        <div className="pointer-events-none absolute -right-56 top-20 -z-10 hidden h-[620px] w-[620px] rounded-full border border-blue-200/45 dark:border-white/10 lg:block" />
        <div className="pointer-events-none absolute -right-44 top-32 -z-10 hidden h-[500px] w-[500px] rounded-full border border-blue-200/45 dark:border-white/10 lg:block" />
        <div className="pointer-events-none absolute -right-32 top-44 -z-10 hidden h-[380px] w-[380px] rounded-full border border-blue-200/45 dark:border-white/10 lg:block" />
        <div className="pointer-events-none absolute -right-24 top-56 -z-20 hidden h-72 w-72 rounded-full bg-[#FFC107]/25 blur-3xl dark:bg-[#FFC107]/30 lg:block" />

        <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0">
          <div className="mb-7 inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-xs font-semibold text-[#2563EB] shadow-sm backdrop-blur dark:border-[#14B8A6]/70 dark:bg-[#07111F]/60 dark:text-[#14B8A6] sm:mb-9 sm:gap-3 sm:px-5 sm:text-base">
            <Trophy className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 truncate sm:whitespace-normal">Organize Everything by Event!</span>
          </div>

          <h1
            className="mx-auto mb-6 max-w-6xl font-black leading-[0.98] tracking-tight text-[#0D1B2A] dark:text-[#F8FAFC] [--home-title-size:clamp(2.55rem,11vw,3.4rem)] sm:mb-7 sm:leading-[0.96] sm:[--home-title-size:clamp(3.4rem,7.2vw,6.5rem)]"
            style={{ fontSize: "var(--home-title-size)" }}
          >
            <span className="block">Create Striking</span>
            <span className="block text-[#2563EB] dark:text-[#FFC107]">
              Result Posters.
            </span>
          </h1>

          <p className="mb-5 text-xl font-extrabold leading-tight text-[#0D1B2A] dark:text-slate-100 sm:mb-6 sm:text-[2rem]">
            Effortlessly. Instantly. Beautifully.
          </p>

          <p className="mx-auto mb-9 max-w-3xl px-1 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:mb-11 sm:px-0 sm:text-xl">
            Rankify is your ultimate platform for crafting professional result posters
            for program winners and team standings. Convert data into captivating
            visuals with our intuitive, event-driven workflow.
          </p>

          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex max-w-full items-center justify-center gap-3 transition [--home-cta-min-height:60px] [--home-cta-padding:16px_24px] hover:shadow-[0_22px_44px_rgba(37,99,235,0.38)] sm:gap-4 sm:[--home-cta-min-height:66px] sm:[--home-cta-padding:18px_42px]"
            style={{
              minHeight: "var(--home-cta-min-height)",
              width: "min(100%, 460px)",
              padding: "var(--home-cta-padding)",
              borderRadius: "14px",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1.2,
              border: "none",
              cursor: "pointer",
              pointerEvents: "auto",
              boxShadow: "0 18px 36px rgba(37, 99, 235, 0.32)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#1D4ED8";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#2563EB";
            }}
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started For Free"}
            <ArrowRight className="h-5 w-5 shrink-0 text-white sm:h-6 sm:w-6" strokeWidth={2.2} aria-hidden="true" />
          </button>

          <p className="mt-5 text-base font-medium text-slate-500 dark:text-slate-400">
            No credit card required
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[var(--app-bg)] px-4 py-12 sm:py-24">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="mb-10 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-[var(--app-heading)] sm:text-4xl">
              Everything You Need, All in One Place
            </h2>
            <p className="text-base text-[var(--app-muted)] sm:text-lg">
              PosterGen simplifies poster creation with powerful, easy-to-use features.
            </p>
          </div>

          <div className="grid min-w-0 gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition-shadow hover:bg-[var(--app-surface-elevated)] hover:shadow-md sm:p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--app-heading)]">
                  {feature.title}
                </h3>
                <p className="text-[var(--app-text)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="bg-[var(--app-bg)] px-4 py-12 sm:py-24">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="mb-10 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-[var(--app-heading)] sm:text-4xl">
              Get Stunning Posters in 4 Simple Steps
            </h2>
            <p className="text-base text-[var(--app-muted)] sm:text-lg">
              From setting up your event to sharing eye-catching results.
            </p>
          </div>

          <div className="grid min-w-0 gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
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
                  <div className="absolute left-1/2 top-8 hidden h-1 w-full -translate-x-1/2 translate-y-0 transform bg-gradient-to-r from-[var(--app-primary)] to-[var(--app-success)]/30 lg:block"></div>
                )}

                <div className="relative min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition-shadow hover:bg-[var(--app-surface-elevated)] hover:shadow-md sm:p-6">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-primary)]">
                    <span className="text-2xl font-bold text-[var(--app-primary-text)]">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[var(--app-heading)]">
                    {item.title}
                  </h3>
                  <p className="text-[var(--app-text)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-[var(--app-bg)] px-4 py-12 sm:py-24">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="mb-10 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-[var(--app-heading)] sm:text-4xl">
              Unlock the Power of Visual Results
            </h2>
            <p className="text-base text-[var(--app-muted)] sm:text-lg">
              PosterGen offers tangible benefits for any event organizer.
            </p>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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
                className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--app-success)]/30 bg-[var(--app-success)]/10 px-4 py-3 sm:px-6"
              >
                <Check className="h-5 w-5 flex-shrink-0 text-[var(--app-success)]" />
                <span className="min-w-0 text-sm font-medium text-[var(--app-heading)]">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-br from-[var(--app-primary)] to-[var(--app-success)] px-4 py-12 sm:py-24">
        <div className="mx-auto max-w-4xl min-w-0 text-center">
          <h2 className="mb-6 text-2xl font-bold text-white sm:text-4xl">
            Ready to Elevate Your Event Announcements?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-white/90 sm:mb-10 sm:text-lg">
            Join PosterGen today and start creating result posters that captivate and
            celebrate. It's free to get started, and powerful enough to grow with you.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg bg-[var(--app-surface)] px-5 py-4 text-base font-semibold text-[var(--app-primary)] shadow-lg transition-colors hover:bg-[var(--app-surface-elevated)] hover:shadow-xl sm:px-8 sm:text-lg"
          >
            {isLoggedIn ? "Back to My Dashboard" : "Sign Up & Start Creating"}
            <ArrowRight className="h-5 w-5 shrink-0" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-w-0 flex-col items-center justify-between gap-5 text-center sm:flex-row sm:gap-6 sm:text-left">
            <div className="flex items-center gap-2">
              <img
                src={logoLight}
                alt="Rankify"
                className="h-9 w-auto object-contain dark:hidden"
              />
              <img
                src={logoDark}
                alt="Rankify"
                className="hidden h-9 w-auto object-contain dark:block"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
              © 2026 Rankify. All rights reserved.
            </div>

            <div className="text-sm text-[var(--app-muted)]">
              by salimkrd.com
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
