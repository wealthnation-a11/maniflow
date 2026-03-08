import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, MessageSquare, DollarSign, CreditCard, Settings2, Plus, Trash2, Save, GripVertical, Send, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useBotConfig, generateAIResponse, type QARule, type NegotiationRule } from "@/store/botConfig";

export default function BotConfig() {
  const { config, setConfig } = useBotConfig();
  const [newKeyword, setNewKeyword] = useState("");

  // ── Chat Preview State ──
  type PreviewMsg = { role: "customer" | "ai"; text: string };
  const [previewMessages, setPreviewMessages] = useState<PreviewMsg[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewTyping, setPreviewTyping] = useState(false);
  const previewEndRef = useRef<HTMLDivElement>(null);
  const previewConvId = useRef(Date.now());

  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMessages.length, previewTyping]);

  const sendPreviewMessage = () => {
    if (!previewInput.trim()) return;
    const userText = previewInput.trim();
    setPreviewInput("");
    setPreviewMessages((prev) => [...prev, { role: "customer", text: userText }]);
    setPreviewTyping(true);
    setTimeout(() => {
      const reply = generateAIResponse(userText, "Test Customer", config, previewConvId.current);
      setPreviewMessages((prev) => [...prev, { role: "ai", text: reply }]);
      setPreviewTyping(false);
    }, 800);
  };

  const resetPreview = () => {
    setPreviewMessages([]);
    previewConvId.current = Date.now();
  };

  // ── Q&A Pairs ──
  const addQARule = () => {
    setConfig((prev) => ({
      ...prev,
      qaRules: [
        ...prev.qaRules,
        { id: Date.now().toString(), keywords: ["new keyword"], response: "Your answer here..." },
      ],
    }));
  };

  const updateQARule = (id: string, updates: Partial<QARule>) => {
    setConfig((prev) => ({
      ...prev,
      qaRules: prev.qaRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteQARule = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      qaRules: prev.qaRules.filter((r) => r.id !== id),
    }));
  };

  const addKeywordToRule = (ruleId: string) => {
    if (!newKeyword.trim()) return;
    setConfig((prev) => ({
      ...prev,
      qaRules: prev.qaRules.map((r) =>
        r.id === ruleId ? { ...r, keywords: [...r.keywords, newKeyword.trim()] } : r
      ),
    }));
    setNewKeyword("");
  };

  const removeKeywordFromRule = (ruleId: string, keyword: string) => {
    setConfig((prev) => ({
      ...prev,
      qaRules: prev.qaRules.map((r) =>
        r.id === ruleId ? { ...r, keywords: r.keywords.filter((k) => k !== keyword) } : r
      ),
    }));
  };

  // ── Negotiation Rules ──
  const addNegotiationRule = () => {
    setConfig((prev) => ({
      ...prev,
      negotiationRules: [
        ...prev.negotiationRules,
        {
          id: Date.now().toString(),
          productName: "New Product",
          price: 10000,
          minPrice: 8000,
          maxPrice: 10000,
          negotiable: true,
          autoAcceptAbove: 9000,
        },
      ],
    }));
  };

  const updateNegotiationRule = (id: string, updates: Partial<NegotiationRule>) => {
    setConfig((prev) => ({
      ...prev,
      negotiationRules: prev.negotiationRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteNegotiationRule = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      negotiationRules: prev.negotiationRules.filter((r) => r.id !== id),
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Bot className="h-7 w-7 text-primary" />
          Bot Configuration
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set up your AI sales bot — define Q&A, pricing rules, and payment details
        </p>
      </div>

      <Tabs defaultValue="qa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="qa" className="text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" /> Q&A
          </TabsTrigger>
          <TabsTrigger value="negotiation" className="text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" /> Payment
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <Settings2 className="h-4 w-4 mr-1 hidden sm:inline" /> General
          </TabsTrigger>
        </TabsList>

        {/* ── Q&A Pairs Tab ── */}
        <TabsContent value="qa" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define keyword triggers and automatic responses
            </p>
            <Button size="sm" onClick={addQARule} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </div>

          {config.qaRules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl shadow-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Rule #{idx + 1}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteQARule(rule.id)} className="text-destructive h-7">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div>
                <Label className="text-xs">Keywords (triggers)</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {rule.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => removeKeywordFromRule(rule.id, kw)}
                      title="Click to remove"
                    >
                      {kw} ×
                    </span>
                  ))}
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add keyword..."
                      className="h-7 text-xs w-28"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeywordToRule(rule.id);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Bot Response</Label>
                <Textarea
                  className="mt-1 text-sm min-h-[80px]"
                  value={rule.response}
                  onChange={(e) => updateQARule(rule.id, { response: e.target.value })}
                />
              </div>
            </motion.div>
          ))}
        </TabsContent>

        {/* ── Negotiation Rules Tab ── */}
        <TabsContent value="negotiation" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Set product prices and negotiation ranges
            </p>
            <Button size="sm" onClick={addNegotiationRule} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </div>

          {config.negotiationRules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl shadow-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Input
                  className="font-medium text-sm h-8 w-48 border-dashed"
                  value={rule.productName}
                  onChange={(e) => updateNegotiationRule(rule.id, { productName: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Negotiable</Label>
                    <Switch
                      checked={rule.negotiable}
                      onCheckedChange={(v) => updateNegotiationRule(rule.id, { negotiable: v })}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteNegotiationRule(rule.id)} className="text-destructive h-7">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Listed Price (₦)</Label>
                  <Input
                    type="number"
                    className="mt-1 h-8 text-sm"
                    value={rule.price}
                    onChange={(e) => updateNegotiationRule(rule.id, { price: Number(e.target.value), maxPrice: Number(e.target.value) })}
                  />
                </div>
                {rule.negotiable && (
                  <>
                    <div>
                      <Label className="text-xs">Min Price (₦)</Label>
                      <Input
                        type="number"
                        className="mt-1 h-8 text-sm"
                        value={rule.minPrice}
                        onChange={(e) => updateNegotiationRule(rule.id, { minPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Auto-Accept Above (₦)</Label>
                      <Input
                        type="number"
                        className="mt-1 h-8 text-sm"
                        value={rule.autoAcceptAbove}
                        onChange={(e) => updateNegotiationRule(rule.id, { autoAcceptAbove: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}
              </div>

              {rule.negotiable && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    💡 Bot will accept offers above ₦{rule.autoAcceptAbove.toLocaleString()}, negotiate between ₦{rule.minPrice.toLocaleString()}–₦{rule.autoAcceptAbove.toLocaleString()}, and reject below ₦{rule.minPrice.toLocaleString()}.
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </TabsContent>

        {/* ── Payment Details Tab ── */}
        <TabsContent value="payment" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These details are shared automatically after a customer agrees to a price
          </p>

          <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
            <div>
              <Label className="text-sm">Bank Name</Label>
              <Input
                className="mt-1"
                value={config.paymentDetails.bankName}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, bankName: e.target.value },
                  }))
                }
                placeholder="e.g. GTBank"
              />
            </div>
            <div>
              <Label className="text-sm">Account Number</Label>
              <Input
                className="mt-1 font-mono"
                value={config.paymentDetails.accountNumber}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, accountNumber: e.target.value },
                  }))
                }
                placeholder="e.g. 0123456789"
              />
            </div>
            <div>
              <Label className="text-sm">Account Name</Label>
              <Input
                className="mt-1"
                value={config.paymentDetails.accountName}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, accountName: e.target.value },
                  }))
                }
                placeholder="e.g. My Business Ltd"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mt-2">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Preview — what customers will see:</p>
              <div className="bg-card rounded-lg p-3 text-sm border">
                <p>Great! 🎉 Please make payment to:</p>
                <p className="mt-2">🏦 Bank: <strong>{config.paymentDetails.bankName || "—"}</strong></p>
                <p>💳 Account: <strong>{config.paymentDetails.accountNumber || "—"}</strong></p>
                <p>👤 Name: <strong>{config.paymentDetails.accountName || "—"}</strong></p>
                <p>💰 Amount: <strong>₦XX,XXX</strong></p>
                <p className="mt-2">Send confirmation after payment! ✅</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── General Settings Tab ── */}
        <TabsContent value="settings" className="space-y-4">
          <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
            <div>
              <Label className="text-sm">Greeting Message</Label>
              <p className="text-xs text-muted-foreground mb-1">Sent when someone says "Hi" or "Hello"</p>
              <Textarea
                className="text-sm min-h-[60px]"
                value={config.botSettings.greeting}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    botSettings: { ...prev.botSettings, greeting: e.target.value },
                  }))
                }
              />
            </div>

            <div>
              <Label className="text-sm">Fallback Message</Label>
              <p className="text-xs text-muted-foreground mb-1">Sent when the bot doesn't understand a message</p>
              <Textarea
                className="text-sm min-h-[60px]"
                value={config.botSettings.fallback}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    botSettings: { ...prev.botSettings, fallback: e.target.value },
                  }))
                }
              />
            </div>

            <div>
              <Label className="text-sm">AI Conversation Tone</Label>
              <div className="flex gap-2 mt-2">
                {(["friendly", "professional", "casual"] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        botSettings: { ...prev.botSettings, tone },
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      config.botSettings.tone === tone
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={() => toast.success("Bot configuration saved!")}
            className="gradient-primary text-primary-foreground"
          >
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
