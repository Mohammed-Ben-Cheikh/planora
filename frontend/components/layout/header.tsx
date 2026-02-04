"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold text-slate-900">
                Planora
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/events"
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Événements
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/my-reservations"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Mes réservations
                </Link>
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-4 ml-2 pl-6 border-l border-slate-200">
                  <Link
                    href="/profile"
                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    {user?.username}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-600">
                    Connexion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                    Inscription
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100">
            <div className="flex flex-col gap-4">
              <Link
                href="/events"
                className="text-slate-600 hover:text-slate-900 font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Événements
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/my-reservations"
                    className="text-slate-600 hover:text-slate-900 font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mes réservations
                  </Link>
                  <Link
                    href="/profile"
                    className="text-slate-600 hover:text-slate-900 font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="text-blue-500 hover:text-blue-600 font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Administration
                    </Link>
                  )}
                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={logout}
                      className="text-slate-500 w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Déconnexion
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-300"
                    >
                      Connexion
                    </Button>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      size="sm"
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      Inscription
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
