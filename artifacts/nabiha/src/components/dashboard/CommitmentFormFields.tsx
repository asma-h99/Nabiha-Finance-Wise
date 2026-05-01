import * as z from "zod";
import { type Control, useWatch } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getCurrency } from "@/lib/currency";

export const commitmentFormSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ يجب أن يكون أكبر من 0"),
  dueDay: z.coerce.number().min(1, "يوم الدفع مطلوب").max(31, "يوم غير صالح"),
  notes: z.string().optional(),
  endDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "تاريخ غير صالح",
    ),
  scope: z.enum(["recurring", "one-time"]).default("recurring"),
});

export type CommitmentFormValues = z.infer<typeof commitmentFormSchema>;

export const commitmentFormDefaultValues: CommitmentFormValues = {
  title: "",
  amount: 0,
  dueDay: 1,
  notes: "",
  endDate: "",
  scope: "recurring",
};

export function CommitmentFormFields({
  control,
  baseCurrency,
  showScopePicker = false,
}: {
  control: Control<CommitmentFormValues>;
  baseCurrency: string;
  showScopePicker?: boolean;
}) {
  const scope = useWatch({ control, name: "scope" });

  return (
    <>
      {showScopePicker && (
        <FormField
          control={control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع الالتزام</FormLabel>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => field.onChange("recurring")}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    field.value === "recurring"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  كل شهر (متكرر)
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("one-time")}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    field.value === "one-time"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  هذا الشهر فقط
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الاسم</FormLabel>
            <FormControl>
              <Input
                placeholder="إيجار، فاتورة كهرباء..."
                className="h-11 rounded-xl bg-background"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-11 rounded-xl bg-background"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="dueDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>يوم الدفع (1–31)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  className="h-11 rounded-xl bg-background"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {scope !== "one-time" && (
        <FormField
          control={control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تاريخ الانتهاء (اختياري)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="h-11 rounded-xl bg-background"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription className="text-[11px]">
                متى ينتهي هذا الالتزام؟ اتركه فارغاً للالتزامات المستمرة.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ملاحظات (اختياري)</FormLabel>
            <FormControl>
              <Input
                placeholder="رقم حساب، تفاصيل..."
                className="h-11 rounded-xl bg-background"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
