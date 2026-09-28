import { EvaluationForm } from "@/components/evaluate/evaluation-form";

export default function NewEvaluationPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New Evaluation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload candidate resumes and score them against your rubric.
        </p>
      </div>
      <EvaluationForm />
    </div>
  );
}
