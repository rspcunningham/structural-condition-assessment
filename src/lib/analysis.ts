
export type AnalysisResult = {
  component_type: string;
  condition_grade: number;
  condition_description: string;
  maintenance_recommendations: string;
};


export interface ImageData {
    file: File;
    description: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result);
        } else {
            reject(new Error('Failed to convert file to base64'));
        }
        };
        reader.onerror = error => reject(error);
    });
};

export const analyseImage = async (image: ImageData): Promise<AnalysisResult> => {
    const { file, description } = image;
    const base64Image = await fileToBase64(file);
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image, description })
    });

    if (!response.ok) {
        throw new Error('Failed to analyze image');
    }

    return response.json();
};