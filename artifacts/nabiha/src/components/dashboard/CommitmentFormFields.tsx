import * as z from "zod";
import { type Control } from "react-hook-form";
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
});

export type CommitmentFormValues = z.infer<typeof commitmentFormSchema>;

export const commitmentFormDefaultValues: CommitmentFormValues = {
  title: "",
  amount: 0,
  dueDay: 1,
  notes: "",
  endDate: "",
};

export function CommitmentFormFields({
  control,
  baseCurrency,
}: {
  control: Control<CommitmentFormValues>;
  baseCurrency: string;
}) {
  return (
    <>
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
