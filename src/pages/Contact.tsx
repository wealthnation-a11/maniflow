import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Send, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Message sent! We'll get back to you within 24 hours.");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        <Link to="/auth?mode=signup"><Button size="sm">Get Started</Button></Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground">Have a question? We'd love to hear from you.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Email</p>
                <p className="text-sm text-muted-foreground">hello@autoserve.co</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Phone</p>
                <p className="text-sm text-muted-foreground">+234 800 AUTO SERVE</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Office</p>
                <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
              </div>
            </div>
          </div>

          {submitted ? (
            <div className="bg-card rounded-xl shadow-card p-8 text-center">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <Send className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-card p-6 space-y-4">
              <div>
                <Label className="text-sm">Name</Label>
                <Input placeholder="Your name" className="mt-1" required />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input type="email" placeholder="you@example.com" className="mt-1" required />
              </div>
              <div>
                <Label className="text-sm">Message</Label>
                <Textarea placeholder="How can we help?" className="mt-1" rows={4} required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                Send Message <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
