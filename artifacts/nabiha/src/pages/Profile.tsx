import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useGetProfile,
  useUpdateProfile,
  getGetProfileQueryKey,
  type Currency,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, User, Wallet, Mail } from "lucide-react";

export default function Profile() {
  const { user } = useUser();
  const { data: profile, isLoading } = useGetProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        toast({ title: "تم الحفظ", description: "تم تحديث ملفّك الشخصي" });
      },
    },
  });

  const [salary, setSalary] = useState("");
  const [currency, setCurrency] = useState<Currency>("JOD");

  useEffect(() => {
    if (profile) {
      setSalary(profile.monthlySalary.toString());
      setCurrency(profile.currency);
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      data: {
        monthlySalary: parseFloat(salary || "0"),
        currency,
        onboardingComplete: true,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold mb-2">ملفّي الشخصي</h1>
        <p className="text-muted-foreground">إدارة بياناتك المالية الأساسية</p>
      </div>

      {/* Account info */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-[#7C3AED] text-white text-2xl font-bold">
              {user?.firstName?.[0] ??
                user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ??
                "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-bold">
              {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.emailAddresses?.[0]?.emailAddress}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Financial settings */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            الإعدادات المالية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">العملة الأساسية</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger
                className="h-12"
                data-testid="profile-currency"
                disabled={isLoading}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-3">
                      <span className="font-bold w-12">{c.symbol}</span>
                      <span>{c.labelAr}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">الراتب الشهري</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="h-14 text-2xl font-bold text-left pl-20"
                data-testid="profile-salary"
                disabled={isLoading}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">
                {CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol ?? ""}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="bg-gradient-to-l from-primary to-[#7C3AED] text-white gap-2"
            data-testid="btn-save-profile"
          >
            <Save className="w-4 h-4" />
            {updateProfile.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
