import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function ProductImageUpload({ value, onChange }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to upload images.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use a JPG, PNG, WEBP, GIF or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image is larger than 5MB. Please choose a smaller file.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/products/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
      setUploading(false);
      toast.error(`Upload failed: ${error.message}`);
      return;
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");
  };

  return (
    <div>
      <Label className="text-sm">Product Image</Label>

      <div className="mt-1 flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 rounded-lg border bg-muted overflow-hidden flex items-center justify-center relative">
          {value ? (
            <>
              <img src={value} alt="Product preview" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange("")}
                className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1.5" />}
            {uploading ? "Uploading…" : "Upload from device"}
          </Button>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="text-xs h-8"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WEBP or GIF · up to 5MB</p>
    </div>
  );
}
