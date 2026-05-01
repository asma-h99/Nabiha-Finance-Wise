import * as z from "zod";
import { type Control, useWatch, useFormContext } from "react-hook-form";
import { useEffect, useRef } from "react";
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
import { getCategoryEmoji, getEmojiForTitle } from "@/lib/categoryEmoji";
import { useListCategories } from "@workspace/api-client-react";

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
  categoryId: z.number().nullable().optional(),
});

export type CommitmentFormValues = z.infer<typeof commitmentFormSchema>;

export const commitmentFormDefaultValues: CommitmentFormValues = {
  title: "",
  amount: 0,
  dueDay: 1,
  notes: "",
  endDate: "",
  scope: "recurring",
  categoryId: null,
};

function useBestCategoryId(
  title: string,
  categories: { id: number; name: string; icon?: string | null }[],
): number | null {
  if (!title || !categories.length) return null;
  const titleEmoji = getEmojiForTitle(title);
  if (!titleEmoji) return null;

  const catEmojiMap = new Map<string, number>();
  for (const cat of categories) {
    const emoji = getCategoryEmoji(cat.name, cat.icon);
    if (!catEmojiMap.has(emoji)) catEmojiMap.set(emoji, cat.id);
  }

  return catEmojiMap.get(titleEmoji) ?? null;
}

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
  const titleValue = useWatch({ control, name: "title" });
  const currentCategoryId = useWatch({ control, name: "categoryId" });

  const { setValue } = useFormContext<CommitmentFormValues>();
  const { data: categories } = useListCategories();

  const suggestedCategoryId = useBestCategoryId(titleValue ?? "", categories ?? []);

  // Set to true when the user explicitly clicks any category chip (including clear).
  // Prevents auto-suggestion from overriding a deliberate user choice.
  const categoryUserTouched = useRef(false);

  // Tracks the categoryId that was last set by auto-suggestion (not by the user
  // or by the server). Used to distinguish "auto-suggested, can re-suggest on
  // title change" from "loaded from server on edit, must not overwrite".
  const autoSuggestedRef = useRef<number | null>(null);

  // Reset both flags when the form is cleared (new form dialog opened).
  useEffect(() => {
    if (!titleValue) {
      categoryUserTouched.current = false;
      autoSuggestedRef.current = null;
    }
  }, [titleValue]);

  // Auto-suggest a category as the user types, subject to these guards:
  //   1. User has not explicitly interacted with the picker.
  //   2. The current categoryId is either null (no category) or was set by a
  //      previous auto-suggestion — never overwrite a server-persisted value.
  useEffect(() => {
    if (categoryUserTouched.current) return;
    const currentIsServerValue =
      currentCategoryId !== null &&
      currentCategoryId !== undefined &&
      currentCategoryId !== autoSuggestedRef.current;
    if (currentIsServerValue) return;

    if (suggestedCategoryId !== null) {
      setValue("categoryId", suggestedCategoryId);
      autoSuggestedRef.current = suggestedCategoryId;
    } else if (autoSuggestedRef.current !== null) {
      setValue("categoryId", null);
      autoSuggestedRef.current = null;
    }
  }, [suggestedCategoryId, currentCategoryId, setValue]);

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

      {/* Category picker */}
      {(categories ?? []).length > 0 && (
        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الفئة (اختياري)</FormLabel>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    categoryUserTouched.current = true;
                    field.onChange(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    field.value === null || field.value === undefined
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  بلا فئة
                </button>
                {(categories ?? []).map((cat) => {
                  const emoji = getCategoryEmoji(cat.name, cat.icon);
                  const isSelected = field.value === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        categoryUserTouched.current = true;
                        field.onChange(cat.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

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
