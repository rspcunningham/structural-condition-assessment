import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { image, description } = await request.json();

        console.log({image, description});

        const imageUrl = image.startsWith('data:image/') 
            ? image 
            : `data:image/jpeg;base64,${image}`;

        const descriptionPrompt = description 
            ? "When taking the photo, the inspecting engineer provided a description of the component. Use this description to help you determine the component type and condition, as well as any relevant details." 
            : "";
        
        const systemPrompt = "Identify the type of industrial mechanical component shown in the image, grade its condition, describe the condition, and provide maintenance recommendations.\n\nYou will analyze an image of an industrial mechanical component such as a furnace, an outlet, or a boiler. Your task is to determine the component type, assess its condition, describe the condition, and suggest necessary maintenance actions. If an area in the image is circled or annotated with a red drawing, you should focus exclusively on that part of the image. " + descriptionPrompt + "\n\n# Steps\n\n1. **Identify Component Type**: Determine and specify the type of industrial mechanical component shown in the image. You should be as specific and accurate as possible. For example, use categories like 'Vented Gas Furnace' instead of 'HVAC System'.\n2. **Assess Condition**: Evaluate the component's condition based on visual inspection and grade it either 'Poor', 'Fair', or 'Good'. Use the grading scale as follows:\n   - Poor: below standard, should be replaced or overhauled.\n   - Fair: average condition, action qill required soon, but not immediately.\n   - Good: Above average. No action needed to maintain optimal working condition.\n3. **Describe Condition**: Provide a detailed description of the component's current physical state and any visible defects or issues.\n4. **Maintenance Recommendations**: Suggest actions or repairs required to keep the component in compliance with safety and operational codes.\n\n# Output Format\n\nThe response must be a JSON object with the following structure:\n\n```json\n{\n  \"component_type\": \"string\",\n  \"condition_grade\": number,\n  \"condition_description\": \"string\",\n  \"maintenance_recommendations\": \"string\"\n}\n```\n\n# Examples\n\n**Input**: Image of a rusted boiler\n\n**Output**:\n```json\n{\n  \"component_type\": \"Boiler\",\n  \"condition_grade\": poor,\n  \"condition_description\": \"The boiler has extensive rust on the surface, with visible leaks at several joints.\",\n  \"maintenance_recommendations\": \"Immediate repair of leaks and rust removal is necessary. Consider replacing if leaks persist.\"\n}\n```\n\n**Input**: Image of a new furnace\n\n**Output**:\n```json\n{\n  \"component_type\": \"Furnace\",\n  \"condition_grade\": good,\n  \"condition_description\": \"The furnace appears brand new with no visible defects or operational concerns.\",\n  \"maintenance_recommendations\": \"No immediate maintenance is needed; adhere to regular maintenance schedule.\"\n}\n```\n\n# Notes\n\n- Focus on visible attributes of the component to determine condition and appropriate maintenance.\n- Ensure that recommendations maintain safety standards and operational efficiency.\n- For components with severe issues, prioritize safety in the recommendation.\n\n"

        console.log(systemPrompt);

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
                "type": "image_url",
                "image_url": {
                    "url": imageUrl
                }
                },
                ...(description ? [{
                    "type": "text" as const,
                    "text": "The engineer provided the following description of the component: " + description
                }] : [])
            ]
            }
        ];
        console.dir(messages, {depth: null});
        const response = await openai.beta.chat.completions.parse({
            model: "o1",
            messages: messages,
            store: true,
            response_format: {
                "type": "json_schema",
                "json_schema": {
                "name": "condition_assessment",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {
                    "component_type": {
                        "type": "string",
                        "description": "The type of component being evaluated."
                    },
                    "condition_grade": {
                        "type": "string",
                        "description": "A grade representing the condition of the component. Must be one of: 'Poor', 'Fair', 'Good'."
                    },
                    "condition_description": {
                        "type": "string",
                        "description": "A textual description of the component's condition."
                    },
                    "maintenance_recommendations": {
                        "type": "string",
                        "description": "Recommendations regarding maintenance for the component."
                    }
                    },
                    "required": [
                    "component_type",
                    "condition_grade",
                    "condition_description",
                    "maintenance_recommendations"
                    ],
                    "additionalProperties": false
                }
                }
            },
            //temperature: 0.0,
            reasoning_effort: "low"
            }
        );

        return NextResponse.json(response.choices[0].message.parsed);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
    }
} 