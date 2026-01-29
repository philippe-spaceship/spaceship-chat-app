import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import spaceshipLogo from "@/assets/spaceship-logo.png";
import aiAvatar from "@/assets/ai-avatar.png";

const Welcome = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("username", username);
      navigate("/chat");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="https://www.spaceshipapp.com/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
            <img src={spaceshipLogo} alt="Spaceship Logo" className="h-8 hover:opacity-80 transition-opacity" />
          </a>
          <h1 className="text-xl font-semibold text-foreground">Spaceship Bot</h1>
          <img src={aiAvatar} alt="AI Avatar" className="h-16 rounded-full" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-fit">
            <img src={spaceshipLogo} alt="Spaceship Logo" className="h-16" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Spaceship Bot</CardTitle>
          <CardDescription className="text-base">
            Enter your username to start conversing with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={!username.trim()}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Welcome;
