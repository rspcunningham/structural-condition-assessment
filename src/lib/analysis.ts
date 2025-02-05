
export type AnalysisResult = {
  component_type: string;
  condition_grade: number;
  condition_description: string;
  maintenance_recommendations: string;
};

export const analyseImage = async (image: string): Promise<AnalysisResult> => {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image })
    });

    if (!response.ok) {
        throw new Error('Failed to analyze image');
    }

    return response.json();
};