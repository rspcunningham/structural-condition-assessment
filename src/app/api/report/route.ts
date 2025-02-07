import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { address, components } = await request.json();

        const systemPrompt = `Prepare a building condition assessment report that includes an introduction and a summary in JSON format as full paragraphs.

        The introduction should state the address and highlight key results by providing a comprehensive overview, covering essential components and their conditions. The summary should encapsulate the entire assessment with detailed insights, covering the overall condition and any major follow-up actions required.

        # Steps

        1. **Introduction** 
        - **Address**: Start with the address.
        - **Key Results**: Highlight essential results for each component—its name, condition, and key recommendations in a detailed and comprehensive manner.
        
        2. **Summary**
        - **Comprehensive Overview**: Summarize the entire assessment, providing a detailed overview of the overall condition and any major follow-up actions required, using distinct insights from the introduction.

        # Output Format

        - JSON with the following structure:
        {
            "introduction": "Detailed paragraph focusing on key results, including all major points observed.",
            "summary": "Comprehensive paragraph of the assessment, offering a broad overview of the condition and suggested actions."
        }

        # Examples

        **Input**:
        - Address: "123 Main Street"
        - Components: 
        - Component 1: Name: "Roof", Condition: "Good", Description: "Recently repaired with no signs of damage.", Recommendations: "Routine maintenance suggested annually."
        - Component 2: Name: "Foundation", Condition: "Fair", Description: "Minor cracks observed.", Recommendations: "Monitor cracks for further movement."

        **Output**:
        {
        "introduction": "The assessment for 123 Main Street covers two primary components. The roof, which has been recently repaired, is in good condition requiring annual maintenance to ensure continued performance. Meanwhile, the foundation, marked as fair, shows minor cracking. Regular monitoring is advised to track any potential progression of these issues.",
        "summary": "Overall, the building at 123 Main Street displays a satisfactory condition with emphasis on consistent roof maintenance and vigilant observation of the foundation's cracks. Addressing these elements can enhance structural longevity and reduce unforeseen repair needs."
        }

        # Notes

        - Ensure the introduction reflects a detailed overview without verbatim repetition in the summary.
        - Provide fresh insights in the summary, highlighting a holistic perspective of the assessment and pointing out different elements compared to the introduction.
        `

        const messages: ChatCompletionMessageParam[] = [
            {
            "role": "developer",
            "content": [
                {
                "type": "text",
                "text": systemPrompt
                }
            ]
            },
            {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": `Address: ${address}\n\nComponents: ${components}`
                }
            ]
            }
        ];
        console.dir(messages, {depth: null});
        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: messages,
            store: true,
            response_format: {
                "type": "json_schema",
                "json_schema": {
                  "name": "schema_description",
                  "strict": true,
                  "schema": {
                    "type": "object",
                    "properties": {
                      "introduction": {
                        "type": "string",
                        "description": "A brief introduction to the topic."
                      },
                      "summary": {
                        "type": "string",
                        "description": "A concise summary of the information presented."
                      }
                    },
                    "required": [
                      "introduction",
                      "summary"
                    ],
                    "additionalProperties": false
                  }
                }
              },
            }
        );

        return NextResponse.json(response.choices[0].message.parsed);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
    }
} 