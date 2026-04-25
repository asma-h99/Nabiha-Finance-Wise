import React, { useState } from "react";
import { useListCategories, useCreateCategory, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tags, Plus, Trash2, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import smilingMascot from "@assets/Gemini_Generated_Image_7vmi4u7vmi4u7vmi_1777144269396.png";

const formSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export default function Categories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListCategories();
  const createCategory = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "تم إضافة الفئة بنجاح" });
        setIsOpen(false);
        form.reset();
      },
    }
  });
  const deleteCategory = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "تم حذف الفئة بنجاح" });
      },
    }
  });

  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#2E8B8A",
      icon: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createCategory.mutate({ data: values });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border-none shadow-md">
        <div className="flex items-center gap-4">
          <img src={smilingMascot} alt="Mascot" className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Tags className="w-6 h-6 text-primary" />
              فئات المصاريف
            </h1>
            <p className="text-muted-foreground text-sm mt-1">تخصيص وترتيب أبواب الصرف لتسهيل المتابعة.</p>
          </div>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-6 shadow-md hover:shadow-lg transition-all" size="lg">
              <Plus className="w-5 h-5 ml-2" />
              إضافة فئة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl">إضافة فئة</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الفئة</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: مطاعم، مقاضي، بنزين" className="h-12 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اللون المميز</FormLabel>
                        <FormControl>
                          <div className="flex gap-3 items-center">
                            <Input type="color" className="h-12 w-full p-1 rounded-xl cursor-pointer bg-background" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرمز (اختياري)</FormLabel>
                        <FormControl>
                          <Input placeholder="رموز، أيقونات..." className="h-12 rounded-xl text-left bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={createCategory.isPending}>
                  {createCategory.isPending ? "جاري الإضافة..." : "إضافة الفئة"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))
        ) : categories && categories.length > 0 ? (
          categories.map((category) => (
            <Card key={category.id} className="rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card">
              <CardContent className="p-0 flex items-stretch">
                <div 
                  className="w-3 flex-shrink-0" 
                  style={{ backgroundColor: category.color || 'var(--primary)' }}
                />
                <div className="p-4 flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shadow-inner border border-border/50">
                      {category.icon ? category.icon : <Hash className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <span className="font-semibold text-lg text-foreground">{category.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                        deleteCategory.mutate({ id: category.id });
                      }
                    }}
                    disabled={deleteCategory.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border">
            <Tags className="w-12 h-12 mb-4 opacity-50 text-primary" />
            <p className="text-lg">لم تقم بإضافة أي فئات بعد</p>
            <p className="text-sm mt-1">ابدأ بتصنيف مصاريفك لتتبع أفضل.</p>
          </div>
        )}
      </div>
    </div>
  );
}
