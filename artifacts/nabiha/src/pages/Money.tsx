import { useState, useEffect, useMemo } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useListCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListExpensesQueryKey,
  getListCommitmentsQueryKey,
  getListCategoriesQueryKey,
  type Expense,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control } from "react-hook-form";
import * as z from "zod";
import {
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Tags,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";
import { getCategoryEmoji } from "@/lib/categoryEmoji";
import { cn } from "@/lib/utils";

import emptyMascot from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";

/* -------------------------------------------------------------------------- */
/*                              Constants & types                              */
/* -------------------------------------------------------------------------- */

const ARABIC_MONTHS_ABBR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const PRIORITY_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  essential: {
    label: "ضرورية",
    color: "bg-destructive/10 text-destructive border-destructive/20",
  },
  important: {
    label: "مهمة",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  luxury: {
    label: "كمالية",
    color: "bg-muted text-muted-foreground border-border",
  },
};

const DASHBOARD_KEYS: readonly (readonly string[])[] = [
  ["/api/dashboard/summary"],
  ["/api/balance/summary"],
];

type TabKey = "all" | "expenses" | "commitments";

type TimelineRow =
  | {
      kind: "expense";
      id: number;
      date: Date;
      title: string;
      amount: number;
      categoryId?: number | null;
      categoryName?: string | null;
      priority: string;
      raw: Expense;
    }
  | {
      kind: "commitment";
      id: number;
      date: Date;
      title: string;
      amount: number;
      isPaid: boolean;
      isOverdue: boolean;
      isFuture: boolean;
      dueDay: number;
      notes?: string | null;
      raw: {
        id: number;
        title: string;
        amount: number;
        dueDay: number;
        isPaid: boolean;
        notes?: string | null;
      };
    };

/* -------------------------------------------------------------------------- */
/*                                  Schemas                                   */
/* -------------------------------------------------------------------------- */

const expenseSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من 0"),
  priority: z.enum(["essential", "important", "luxury"]),
  categoryId: z.coerce.number().optional().nullable(),
  date: z.string().min(1, "التاريخ مطلوب"),
  notes: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

const commitmentSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ يجب أن يكون أكبر من 0"),
  dueDay: z.coerce.number().min(1, "يوم الدفع مطلوب").max(31, "يوم غير صالح"),
  notes: z.string().optional(),
});
type CommitmentFormValues = z.infer<typeof commitmentSchema>;

const categorySchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type EditingCommitment = {
  id: number;
  title: string;
  amount: number | string;
  dueDay: number;
  notes?: string | null;
  isPaid: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                Page component                              */
/* -------------------------------------------------------------------------- */

export default function Money() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format, baseCurrency } = useDisplayCurrency();

  /* ── filters ────────────────────────────────────────────────────────── */
  const [filterMonth, setFilterMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [tab, setTab] = useState<TabKey>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | number>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  /* ── data ───────────────────────────────────────────────────────────── */
  const { data: expenses, isLoading: loadingExpenses } = useListExpenses({
    month: filterMonth,
  });
  const { data: commitments, isLoading: loadingCommitments } =
    useListCommitments();
  const { data: categories } = useListCategories();

  /* ── invalidation helpers ───────────────────────────────────────────── */
  const invalidateExpenses = () => {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    DASHBOARD_KEYS.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key }),
    );
  };

  const invalidateCommitments = () => {
    queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
    DASHBOARD_KEYS.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key }),
    );
  };

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
  };

  /* ── expense mutations ──────────────────────────────────────────────── */
  const [expenseAddOpen, setExpenseAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const expenseDefaultValues: ExpenseFormValues = {
    title: "",
    amount: 0,
    priority: "important",
    categoryId: undefined,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  };

  const createExpenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseDefaultValues,
  });

  const editExpenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseDefaultValues,
  });

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        invalidateExpenses();
        toast({ title: "تم إضافة المصروف بنجاح" });
        setExpenseAddOpen(false);
        createExpenseForm.reset(expenseDefaultValues);
      },
    },
  });

  const updateExpense = useUpdateExpense({
    mutation: {
      onSuccess: () => {
        invalidateExpenses();
        toast({ title: "تم تعديل المصروف بنجاح" });
        setEditingExpense(null);
      },
    },
  });

  const deleteExpense = useDeleteExpense({
    mutation: {
      onSuccess: () => {
        invalidateExpenses();
        toast({ title: "تم الحذف بنجاح" });
      },
    },
  });

  useEffect(() => {
    if (editingExpense) {
      editExpenseForm.reset({
        title: editingExpense.title,
        amount: Number(editingExpense.amount),
        priority: editingExpense.priority,
        categoryId: editingExpense.categoryId ?? undefined,
        date: editingExpense.date,
        notes: editingExpense.notes ?? "",
      });
    }
  }, [editingExpense, editExpenseForm]);

  /* ── commitment mutations ───────────────────────────────────────────── */
  const [commitmentAddOpen, setCommitmentAddOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] =
    useState<EditingCommitment | null>(null);

  const commitmentDefaultValues: CommitmentFormValues = {
    title: "",
    amount: 0,
    dueDay: 1,
    notes: "",
  };

  const createCommitmentForm = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: commitmentDefaultValues,
  });

  const editCommitmentForm = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: commitmentDefaultValues,
  });

  const createCommitment = useCreateCommitment({
    mutation: {
      onSuccess: () => {
        invalidateCommitments();
        toast({ title: "تم إضافة الالتزام بنجاح" });
        setCommitmentAddOpen(false);
        createCommitmentForm.reset(commitmentDefaultValues);
      },
    },
  });

  const updateCommitmentPaid = useUpdateCommitment({
    mutation: { onSuccess: () => invalidateCommitments() },
  });

  const updateCommitmentEdit = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        invalidateCommitments();
        toast({ title: "تم حفظ التعديلات" });
        setEditingCommitment(null);
      },
    },
  });

  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        invalidateCommitments();
        toast({ title: "تم حذف الالتزام بنجاح" });
      },
    },
  });

  useEffect(() => {
    if (editingCommitment) {
      editCommitmentForm.reset({
        title: editingCommitment.title,
        amount: Number(editingCommitment.amount),
        dueDay: editingCommitment.dueDay,
        notes: editingCommitment.notes ?? "",
      });
    }
  }, [editingCommitment, editCommitmentForm]);

  /* ── category management ────────────────────────────────────────────── */
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", color: "#1B7E63", icon: "" },
  });

  const createCategory = useCreateCategory({
    mutation: {
      onSuccess: () => {
        invalidateCategories();
        toast({ title: "تم إضافة الفئة بنجاح" });
        setCreateCategoryOpen(false);
        categoryForm.reset({ name: "", color: "#1B7E63", icon: "" });
      },
    },
  });

  const deleteCategory = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        invalidateCategories();
        toast({ title: "تم حذف الفئة بنجاح" });
      },
    },
  });

  /* ── derived: parse selected month ──────────────────────────────────── */
  const [year, monthIndex] = useMemo(() => {
    const [y, m] = filterMonth.split("-").map(Number);
    return [y, (m ?? 1) - 1];
  }, [filterMonth]);

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && monthIndex === today.getMonth();
  const isFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && monthIndex > today.getMonth());

  /* ── build unified timeline rows ────────────────────────────────────── */
  const allRows: TimelineRow[] = useMemo(() => {
    const rows: TimelineRow[] = [];

    if (expenses) {
      for (const e of expenses) {
        const d = new Date(e.date);
        if (isNaN(d.getTime())) continue;
        rows.push({
          kind: "expense",
          id: e.id,
          date: d,
          title: e.title,
          amount: Number(e.amount),
          categoryId: e.categoryId ?? null,
          categoryName: e.categoryName ?? null,
          priority: e.priority,
          raw: e,
        });
      }
    }

    if (commitments) {
      // Last day of selected month so we don't overflow into next month.
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      for (const c of commitments) {
        const day = Math.min(c.dueDay, lastDay);
        const d = new Date(year, monthIndex, day);
        const isOverdue =
          !c.isPaid && (!isFutureMonth ? (isCurrentMonth ? c.dueDay < today.getDate() : true) : false);
        rows.push({
          kind: "commitment",
          id: c.id,
          date: d,
          title: c.title,
          amount: Number(c.amount),
          isPaid: c.isPaid,
          isOverdue,
          isFuture: isFutureMonth || (isCurrentMonth && c.dueDay >= today.getDate()),
          dueDay: c.dueDay,
          notes: c.notes,
          raw: {
            id: c.id,
            title: c.title,
            amount: Number(c.amount),
            dueDay: c.dueDay,
            isPaid: c.isPaid,
            notes: c.notes,
          },
        });
      }
    }

    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
    return rows;
  }, [expenses, commitments, year, monthIndex, isCurrentMonth, isFutureMonth]);

  /* ── filtering pipeline ─────────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      // Tab
      if (tab === "expenses" && row.kind !== "expense") return false;
      if (tab === "commitments" && row.kind !== "commitment") return false;

      // Category (commitments have no category)
      if (filterCategory !== "all") {
        if (row.kind !== "expense") return false;
        if (row.categoryId !== filterCategory) return false;
      }

      // Priority — only on expenses tab and only for expenses
      if (tab === "expenses" && filterPriority !== "all") {
        if (row.kind !== "expense") return false;
        if (row.priority !== filterPriority) return false;
      }

      return true;
    });
  }, [allRows, tab, filterCategory, filterPriority]);

  /* ── summary totals (reactive to current filters) ───────────────────── */
  const summary = useMemo(() => {
    let totalExpenses = 0;
    let totalCommitments = 0;
    let totalLate = 0;
    for (const row of filteredRows) {
      if (row.kind === "expense") totalExpenses += row.amount;
      else {
        totalCommitments += row.amount;
        if (row.isOverdue) totalLate += row.amount;
      }
    }
    return { totalExpenses, totalCommitments, totalLate };
  }, [filteredRows]);

  /* ── handlers ───────────────────────────────────────────────────────── */
  const onCreateExpenseSubmit = (values: ExpenseFormValues) => {
    createExpense.mutate({ data: values });
  };
  const onEditExpenseSubmit = (values: ExpenseFormValues) => {
    if (!editingExpense) return;
    updateExpense.mutate({ id: editingExpense.id, data: values });
  };
  const onCreateCommitmentSubmit = (values: CommitmentFormValues) => {
    createCommitment.mutate({ data: values });
  };
  const onEditCommitmentSubmit = (values: CommitmentFormValues) => {
    if (!editingCommitment) return;
    updateCommitmentEdit.mutate({ id: editingCommitment.id, data: values });
  };

  const isLoading = loadingExpenses || loadingCommitments;

  return (
    <div
      className="space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700"
      dir="rtl"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2 text-foreground">
              <span aria-hidden>💸</span> مالي الشهري
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              كل مصاريفك والتزاماتك في صفحة واحدة، مرتّبة بالتاريخ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-44 h-11 rounded-xl bg-card border-border/50"
            data-testid="input-month-filter"
          />

          {/* Add expense */}
          <Dialog open={expenseAddOpen} onOpenChange={setExpenseAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-xl h-11 px-4 gap-1.5 shadow-sm"
                data-testid="button-add-expense"
              >
                <Plus className="w-4 h-4" />
                إضافة مصروف
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-xl bg-card max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <DialogHeader>
                <DialogTitle className="text-xl text-right">
                  تسجيل مصروف جديد
                </DialogTitle>
              </DialogHeader>
              <Form {...createExpenseForm}>
                <form
                  onSubmit={createExpenseForm.handleSubmit(onCreateExpenseSubmit)}
                  className="space-y-4 mt-4"
                >
                  <ExpenseFields
                    control={createExpenseForm.control}
                    categories={categories}
                    baseCurrency={baseCurrency}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl mt-6 text-base font-bold shadow-md"
                    disabled={createExpense.isPending}
                  >
                    {createExpense.isPending ? "جاري التسجيل..." : "تسجيل المصروف"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Add commitment */}
          <Dialog open={commitmentAddOpen} onOpenChange={setCommitmentAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl h-11 px-4 gap-1.5 border-primary/25 hover:bg-primary/5"
                data-testid="button-add-commitment"
              >
                <Plus className="w-4 h-4 text-primary" />
                إضافة التزام
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[420px] rounded-3xl p-6 border-none shadow-xl bg-card"
              dir="rtl"
            >
              <DialogHeader>
                <DialogTitle className="text-xl text-right">
                  إضافة التزام مالي
                </DialogTitle>
                <DialogDescription className="text-right text-xs text-muted-foreground">
                  أدخلي اسم الالتزام، المبلغ، ويوم الدفع الشهري.
                </DialogDescription>
              </DialogHeader>
              <Form {...createCommitmentForm}>
                <form
                  onSubmit={createCommitmentForm.handleSubmit(
                    onCreateCommitmentSubmit,
                  )}
                  className="space-y-4 mt-4"
                >
                  <CommitmentFields
                    control={createCommitmentForm.control}
                    baseCurrency={baseCurrency}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl"
                    disabled={createCommitment.isPending}
                  >
                    {createCommitment.isPending
                      ? "جاري الحفظ..."
                      : "حفظ الالتزام"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl bg-card/60 p-1 shadow-sm">
          <TabsTrigger
            value="all"
            className="rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            data-testid="tab-all"
          >
            الكل
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            data-testid="tab-expenses"
          >
            المصاريف
          </TabsTrigger>
          <TabsTrigger
            value="commitments"
            className="rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            data-testid="tab-commitments"
          >
            الالتزامات الثابتة
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Category chips ──────────────────────────────────────────── */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/10 px-3 py-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">
              تصفية حسب الفئة
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 rounded-lg"
            onClick={() => setCategoriesDialogOpen(true)}
            data-testid="button-manage-categories"
          >
            <Tags className="w-3.5 h-3.5" />
            إدارة الفئات
          </Button>
        </div>

        <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:thin]">
          <div className="flex gap-2 items-end min-w-max pb-1">
            <CategoryChip
              label="الكل"
              emoji="✨"
              active={filterCategory === "all"}
              onClick={() => setFilterCategory("all")}
              testid="chip-category-all"
            />
            {(categories ?? []).map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                emoji={getCategoryEmoji(cat.name, cat.icon)}
                active={filterCategory === cat.id}
                onClick={() => setFilterCategory(cat.id)}
                testid={`chip-category-${cat.id}`}
              />
            ))}
          </div>
        </div>

        {/* Priority dropdown — only on Expenses tab */}
        {tab === "expenses" && (
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              الأولوية:
            </span>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger
                className="w-44 h-9 rounded-xl bg-card border-border/50 text-sm"
                data-testid="select-priority-filter"
              >
                <SelectValue placeholder="حسب الأولوية" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="essential">ضرورية فقط</SelectItem>
                <SelectItem value="important">مهمة فقط</SelectItem>
                <SelectItem value="luxury">كمالية فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Timeline list ───────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))
        ) : filteredRows.length === 0 ? (
          <EmptyState
            onAddExpense={() => setExpenseAddOpen(true)}
            onAddCommitment={() => setCommitmentAddOpen(true)}
          />
        ) : (
          filteredRows.map((row) => (
            <TimelineRowItem
              key={`${row.kind}-${row.id}`}
              row={row}
              format={format}
              baseCurrency={baseCurrency}
              categoriesById={
                new Map((categories ?? []).map((c) => [c.id, c]))
              }
              onEditExpense={(e) => setEditingExpense(e)}
              onDeleteExpense={(id) => {
                if (confirm("هل تريد بالتأكيد حذف هذا المصروف؟"))
                  deleteExpense.mutate({ id });
              }}
              onMarkPaid={(id, isPaid) =>
                updateCommitmentPaid.mutate({ id, data: { isPaid } })
              }
              onEditCommitment={(c) => setEditingCommitment(c)}
              onDeleteCommitment={(id) => {
                if (confirm("هل تريد بالتأكيد حذف هذا الالتزام؟"))
                  deleteCommitment.mutate({ id });
              }}
              isPaidPending={updateCommitmentPaid.isPending}
            />
          ))
        )}
      </div>

      {/* ── Sticky summary bar ──────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:right-72 z-30 border-t border-border/60 bg-card/95 backdrop-blur shadow-[0_-4px_18px_rgba(0,0,0,0.06)]"
        dir="rtl"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <SummaryItem
            label="إجمالي المصاريف"
            value={format(summary.totalExpenses, baseCurrency)}
            color="text-foreground"
            testid="summary-expenses"
          />
          <SummaryItem
            label="إجمالي الالتزامات"
            value={format(summary.totalCommitments, baseCurrency)}
            color="text-foreground"
            testid="summary-commitments"
          />
          <SummaryItem
            label="المتأخر"
            value={format(summary.totalLate, baseCurrency)}
            color={summary.totalLate > 0 ? "text-destructive" : "text-muted-foreground"}
            testid="summary-late"
          />
        </div>
      </div>

      {/* ── Edit Expense dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
      >
        <DialogContent
          className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-xl bg-card max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-right">
              تعديل المصروف
            </DialogTitle>
          </DialogHeader>
          <Form {...editExpenseForm}>
            <form
              onSubmit={editExpenseForm.handleSubmit(onEditExpenseSubmit)}
              className="space-y-4 mt-4"
            >
              <ExpenseFields
                control={editExpenseForm.control}
                categories={categories}
                baseCurrency={baseCurrency}
              />
              <Button
                type="submit"
                className="w-full h-12 rounded-xl mt-6 text-base font-bold shadow-md"
                disabled={updateExpense.isPending}
              >
                {updateExpense.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Commitment dialog ──────────────────────────────────── */}
      <Dialog
        open={!!editingCommitment}
        onOpenChange={(open) => !open && setEditingCommitment(null)}
      >
        <DialogContent
          className="sm:max-w-[420px] rounded-3xl p-6 border-none shadow-xl bg-card"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-right flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> تعديل الالتزام
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              عدّلي الاسم، المبلغ، أو يوم الدفع، ثم احفظي التغييرات.
            </DialogDescription>
          </DialogHeader>
          <Form {...editCommitmentForm}>
            <form
              onSubmit={editCommitmentForm.handleSubmit(onEditCommitmentSubmit)}
              className="space-y-4 mt-4"
            >
              <CommitmentFields
                control={editCommitmentForm.control}
                baseCurrency={baseCurrency}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setEditingCommitment(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 rounded-xl"
                  disabled={updateCommitmentEdit.isPending}
                  data-testid="button-save-commitment-edit"
                >
                  {updateCommitmentEdit.isPending
                    ? "جاري الحفظ..."
                    : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Categories management dialog ────────────────────────────── */}
      <Dialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      >
        <DialogContent
          className="sm:max-w-[480px] rounded-3xl p-6 border-none shadow-xl bg-card max-h-[85vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-right flex items-center gap-2">
              <Tags className="w-4 h-4 text-primary" /> إدارة الفئات
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              أضيفي فئات جديدة أو احذفي القديمة لتنظيم مصاريفك.
            </DialogDescription>
          </DialogHeader>

          {/* Existing categories */}
          <div className="mt-4 space-y-2">
            {(categories ?? []).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                لا توجد فئات بعد. أضيفي أول فئة من الزر أدناه.
              </div>
            ) : (
              (categories ?? []).map((cat) => {
                const emoji = getCategoryEmoji(cat.name, cat.icon);
                const color = cat.color ?? "#1B7E63";
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-background"
                    data-testid={`manage-category-${cat.id}`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${color}28 0%, ${color}18 100%)`,
                        borderColor: `${color}35`,
                      }}
                    >
                      {emoji}
                    </div>
                    <span
                      className="flex-1 text-sm font-bold truncate"
                      style={{ color }}
                    >
                      {cat.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`حذف فئة "${cat.name}"؟`)) {
                          deleteCategory.mutate({ id: cat.id });
                        }
                      }}
                      disabled={deleteCategory.isPending}
                      data-testid={`button-delete-category-${cat.id}`}
                      aria-label={`حذف ${cat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Create new */}
          {!createCategoryOpen ? (
            <Button
              variant="outline"
              className="w-full mt-4 rounded-xl h-11 gap-1.5 border-primary/30 hover:bg-primary/5"
              onClick={() => setCreateCategoryOpen(true)}
              data-testid="button-show-add-category"
            >
              <Plus className="w-4 h-4 text-primary" /> إضافة فئة جديدة
            </Button>
          ) : (
            <div className="mt-4 pt-4 border-t border-border/40">
              <Form {...categoryForm}>
                <form
                  onSubmit={categoryForm.handleSubmit((v) =>
                    createCategory.mutate({ data: v }),
                  )}
                  className="space-y-3"
                >
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الفئة</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="مثال: مطاعم، مقاضي، بنزين"
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
                      control={categoryForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اللون</FormLabel>
                          <FormControl>
                            <Input
                              type="color"
                              className="h-11 w-full p-1 rounded-xl cursor-pointer bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رمز خاص (اختياري)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="✨"
                              className="h-11 rounded-xl bg-background text-center text-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => setCreateCategoryOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 rounded-xl"
                      disabled={createCategory.isPending}
                    >
                      {createCategory.isPending ? "جاري الإضافة..." : "إضافة"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                 */
/* -------------------------------------------------------------------------- */

function CategoryChip({
  label,
  emoji,
  active,
  onClick,
  testid,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
  testid?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={cn(
        "group flex flex-col items-center gap-1 px-3 py-2 min-w-[4.25rem] rounded-xl transition-all",
        "hover:bg-primary/5",
      )}
    >
      <span
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center text-2xl transition-all border",
          active
            ? "bg-primary/15 border-primary/40 shadow-md scale-105"
            : "bg-muted/40 border-border/40",
        )}
      >
        {emoji}
      </span>
      <span
        className={cn(
          "text-[11px] leading-tight text-center max-w-[4.5rem] line-clamp-1 transition-all",
          active
            ? "font-extrabold text-primary border-b-2 border-primary pb-0.5"
            : "font-medium text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function SummaryItem({
  label,
  value,
  color,
  testid,
}: {
  label: string;
  value: string;
  color: string;
  testid?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center min-w-0 flex-1">
      <span className="hidden sm:block text-[11px] font-medium text-muted-foreground truncate">
        {label}
      </span>
      <span
        className={cn("text-base sm:text-lg font-extrabold tabular-nums", color)}
        data-testid={testid}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  onAddExpense,
  onAddCommitment,
}: {
  onAddExpense: () => void;
  onAddCommitment: () => void;
}) {
  return (
    <div
      className="py-14 px-6 flex flex-col items-center justify-center text-center bg-card/40 rounded-3xl border border-dashed border-border"
      data-testid="empty-state"
    >
      <img
        src={emptyMascot}
        alt="نَبِيهَة"
        className="w-24 h-24 rounded-full border-4 border-primary/15 object-cover shadow-md mb-4 opacity-90"
      />
      <p className="text-base font-bold text-foreground">
        لا توجد بيانات لهذا الشهر — ابدأ بإضافة مصروف أو التزام!
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <Button
          className="rounded-xl h-10 px-4 gap-1.5"
          onClick={onAddExpense}
          data-testid="empty-add-expense"
        >
          <Plus className="w-4 h-4" /> إضافة مصروف
        </Button>
        <Button
          variant="outline"
          className="rounded-xl h-10 px-4 gap-1.5 border-primary/25 hover:bg-primary/5"
          onClick={onAddCommitment}
          data-testid="empty-add-commitment"
        >
          <Plus className="w-4 h-4 text-primary" /> إضافة التزام
        </Button>
      </div>
    </div>
  );
}

function TimelineRowItem({
  row,
  format,
  baseCurrency,
  categoriesById,
  onEditExpense,
  onDeleteExpense,
  onMarkPaid,
  onEditCommitment,
  onDeleteCommitment,
  isPaidPending,
}: {
  row: TimelineRow;
  format: (amount: number, fromCode?: string) => string;
  baseCurrency: string;
  categoriesById: Map<number, { id: number; name: string; icon?: string | null; color?: string | null }>;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onMarkPaid: (id: number, isPaid: boolean) => void;
  onEditCommitment: (c: EditingCommitment) => void;
  onDeleteCommitment: (id: number) => void;
  isPaidPending: boolean;
}) {
  const day = row.date.getDate();
  const monthLabel = ARABIC_MONTHS_ABBR[row.date.getMonth()];

  const cat =
    row.kind === "expense" && row.categoryId != null
      ? categoriesById.get(row.categoryId)
      : undefined;
  const emoji =
    row.kind === "expense"
      ? cat
        ? getCategoryEmoji(cat.name, cat.icon)
        : "📦"
      : "📅";

  return (
    <Card
      className={cn(
        "rounded-2xl border shadow-sm hover:shadow-md transition-shadow group",
        row.kind === "commitment" && row.isOverdue && "border-destructive/40 bg-destructive/5",
        row.kind === "commitment" && row.isPaid && "bg-muted/30 opacity-80",
      )}
      data-testid={`row-${row.kind}-${row.id}`}
    >
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        {/* Date block (right in RTL) */}
        <div className="flex flex-col items-center justify-center w-14 h-14 bg-secondary/50 rounded-xl border border-border/50 shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground">
            {monthLabel}
          </span>
          <span className="text-lg font-extrabold text-foreground leading-none">
            {day}
          </span>
        </div>

        {/* Emoji */}
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
          <span aria-hidden>{emoji}</span>
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "text-sm sm:text-base font-bold leading-tight truncate",
              row.kind === "commitment" && row.isPaid && "line-through text-muted-foreground",
            )}
          >
            {row.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {row.kind === "expense" ? (
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-lg text-[10px] font-bold border px-1.5 py-0",
                    PRIORITY_LABELS[row.priority]?.color,
                  )}
                >
                  {PRIORITY_LABELS[row.priority]?.label ?? row.priority}
                </Badge>
                {row.categoryName && (
                  <Badge
                    variant="secondary"
                    className="rounded-lg bg-secondary text-secondary-foreground text-[10px] font-medium border-none px-1.5 py-0"
                  >
                    {row.categoryName}
                  </Badge>
                )}
              </>
            ) : (
              <>
                {row.isPaid ? (
                  <Badge
                    variant="outline"
                    className="rounded-lg text-[10px] font-bold bg-primary text-primary-foreground border-primary px-1.5 py-0"
                  >
                    ✓ مدفوع
                  </Badge>
                ) : row.isOverdue ? (
                  <Badge
                    variant="outline"
                    className="rounded-lg text-[10px] font-bold bg-destructive text-destructive-foreground border-destructive px-1.5 py-0"
                  >
                    🔴 متأخر
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-700 border-amber-500/30 px-1.5 py-0"
                  >
                    قادم
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  يوم {row.dueDay}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="text-left mr-1">
            <div className="text-base sm:text-lg font-black text-foreground tabular-nums">
              {format(row.amount, baseCurrency)}
            </div>
          </div>

          {row.kind === "commitment" && row.isOverdue && !row.isPaid && (
            <Button
              size="sm"
              variant="default"
              className="rounded-xl h-8 px-2 text-xs gap-1"
              onClick={() => onMarkPaid(row.id, true)}
              disabled={isPaidPending}
              data-testid={`button-mark-paid-${row.id}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحديد كمدفوع</span>
            </Button>
          )}

          {row.kind === "commitment" && !row.isOverdue && (
            <Button
              size="sm"
              variant={row.isPaid ? "outline" : "ghost"}
              className="rounded-xl h-8 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={() => onMarkPaid(row.id, !row.isPaid)}
              disabled={isPaidPending}
              data-testid={`button-toggle-paid-${row.id}`}
            >
              {row.isPaid ? "تراجع" : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تحديد كمدفوع</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => {
              if (row.kind === "expense") onEditExpense(row.raw);
              else
                onEditCommitment({
                  id: row.id,
                  title: row.title,
                  amount: row.amount,
                  dueDay: row.dueDay,
                  notes: row.notes,
                  isPaid: row.isPaid,
                });
            }}
            data-testid={`button-edit-${row.kind}-${row.id}`}
            aria-label="تعديل"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => {
              if (row.kind === "expense") onDeleteExpense(row.id);
              else onDeleteCommitment(row.id);
            }}
            data-testid={`button-delete-${row.kind}-${row.id}`}
            aria-label="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Form-field fragments                            */
/* -------------------------------------------------------------------------- */

function ExpenseFields({
  control,
  categories,
  baseCurrency,
}: {
  control: Control<ExpenseFormValues>;
  categories?: { id: number; name: string; icon?: string | null }[];
  baseCurrency: string;
}) {
  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>البيان (ماذا اشتريت؟)</FormLabel>
            <FormControl>
              <Input
                placeholder="قهوة، عشاء، تذكرة..."
                className="h-12 rounded-xl bg-background"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
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
                  className="h-12 rounded-xl bg-background text-lg font-semibold"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>التاريخ</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="h-12 rounded-xl bg-background"
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
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الأولوية</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-12 rounded-xl bg-background">
                  <SelectValue placeholder="اختر مستوى الأولوية" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-xl">
                <SelectItem value="essential">ضرورية</SelectItem>
                <SelectItem value="important">مهمة</SelectItem>
                <SelectItem value="luxury">كمالية</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الفئة (اختياري)</FormLabel>
            <Select
              onValueChange={(val) => field.onChange(Number(val))}
              value={field.value?.toString() || ""}
            >
              <FormControl>
                <SelectTrigger className="h-12 rounded-xl bg-background">
                  <SelectValue placeholder="اختر فئة" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-xl max-h-48">
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.icon && <span className="ml-2">{cat.icon}</span>}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                placeholder="تفاصيل إضافية..."
                className="h-12 rounded-xl bg-background"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function CommitmentFields({
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
