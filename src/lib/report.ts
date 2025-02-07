import { AnalysisResult } from "./analysis";

export const generateReport = async (address: string, components: AnalysisResult[]): Promise<{ introduction: string, summary: string }> => {
    const componentsString = JSON.stringify(components);
    const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, components: componentsString })
    });
    return response.json();
}