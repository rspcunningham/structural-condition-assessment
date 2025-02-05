import { assessComponent } from "@/lib/llm";

export type AnalysisResult = {
  component_type: string;
  condition_grade: number;
  condition_description: string;
  maintenance_recommendations: string;
};

export const analyseImage = async (image: string): Promise<AnalysisResult> => {
    const result = await assessComponent(image);
    return result;
};
