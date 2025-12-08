import React, { useState, useCallback } from 'react';
import { ChefHat, CookingPot, Timer, Utensils, AlertTriangle, Loader2 } from 'lucide-react';

// Configuration for the Gemini API call
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const recipeSchema = {
    type: "OBJECT",
    properties: {
        recipeName: {
            type: "STRING",
            description: "A creative and appetizing name for the dish."
        },
        description: {
            type: "STRING",
            description: "A brief, appealing description of the final dish."
        },
        ingredients: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "A list of all ingredients with specific quantities."
        },
        instructions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Step-by-step instructions for preparing the dish."
        },
        prepTimeMinutes: {
            type: "INTEGER",
            description: "The estimated total time (prep + cook) in minutes."
        }
    },
    required: ["recipeName", "ingredients", "instructions", "prepTimeMinutes"]
};

// Utility function to handle API calls with exponential backoff
const fetchWithRetry = async (url, options, maxRetries = 5) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error("Bad Request: Invalid input to the API.");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`API call failed after ${maxRetries} attempts: ${lastError.message}`);
};


const App = () => {
    const [answers, setAnswers] = useState({
        ingredients: '',
        diet: 'veg', // 'veg' or 'non-veg'
        fatType: 'oil', // 'butter' or 'oil'
        allergies: '',
        specialRequest: ''
    });
    const [recipe, setRecipe] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAnswers(prev => ({ ...prev, [name]: value }));
    };

    const generateRecipe = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        setRecipe(null);

        // 1. Construct the detailed user prompt
        const userQuery = `Generate a single, unique food recipe based on the following strict criteria:
- Main Ingredients: ${answers.ingredients || 'I have no specific ingredients, be creative.'}
- Dietary Type: ${answers.diet === 'veg' ? 'Strictly Vegetarian' : 'Non-Vegetarian'}
- Cooking Fat: Use ${answers.fatType} exclusively.
- Allergies to Avoid: ${answers.allergies || 'None, ensure safety.'}
- Special Request/Style: ${answers.specialRequest || 'Make it simple and delicious.'}
The entire response MUST be a single JSON object conforming to the provided schema. DO NOT include any text outside the JSON structure.`;

        // 2. Construct the API payload
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
                temperature: 0.7,
            },
            systemInstruction: {
                parts: [{ text: "You are an expert, world-class chef AI. Your sole purpose is to create novel, detailed, and delicious recipes that strictly adhere to all user criteria and restrictions. Output only the requested JSON object." }]
            }
        };

        try {
            const response = await fetchWithRetry(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
                const errorMessage = result.error?.message || "Received an empty or malformed response from the AI.";
                throw new Error(errorMessage);
            }

            const jsonString = result.candidates[0].content.parts[0].text;
            const parsedRecipe = JSON.parse(jsonString);

            if (!parsedRecipe.recipeName || !Array.isArray(parsedRecipe.ingredients)) {
                throw new Error("Generated JSON is missing core recipe fields.");
            }

            setRecipe(parsedRecipe);

        } catch (err) {
            console.error("Recipe generation failed:", err);
            setError(`Failed to generate recipe: ${err.message}. Please refine your input and try again.`);
        } finally {
            setIsLoading(false);
        }
    }, [answers]);

    const renderRecipeCard = (recipe) => (
        <div className="recipe-card animate-in">
            <div className="recipe-header">
                <ChefHat className="icon-header" size={32} />
                <h2 className="recipe-name">{recipe.recipeName}</h2>
            </div>

            <p className="recipe-description">{recipe.description}</p>

            <div className="recipe-time">
                <Timer size={16} style={{ marginRight: '8px' }} />
                {recipe.prepTimeMinutes} Minutes Total
            </div>

            <div className="recipe-details-grid">
                {/* Ingredients */}
                <div className="ingredients-box">
                    <h3 className="details-title">
                        <Utensils size={20} style={{ marginRight: '8px' }} /> Ingredients
                    </h3>
                    <ul className="details-list">
                        {recipe.ingredients.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                {/* Instructions */}
                <div className="instructions-box">
                    <h3 className="details-title">
                        <CookingPot size={20} style={{ marginRight: '8px' }} /> Instructions
                    </h3>
                    <ol className="details-list ordered">
                        {recipe.instructions.map((step, index) => (
                            <li key={index}>{step}</li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                    
                    /* Base Styles */
                    .app-container {
                        min-height: 100vh;
                        background-color: #f4f7f9;
                        padding: 20px 16px;
                        font-family: 'Inter', sans-serif;
                        box-sizing: border-box;
                    }
                    .main-content {
                        max-width: 1200px;
                        margin: 0 auto;
                        width: 100%;
                    }

                    /* Header */
                    .header {
                        text-align: center;
                        padding: 20px 0 30px;
                    }
                    .header h1 {
                        font-size: 2rem;
                        font-weight: 800;
                        color: #4338ca; 
                        margin: 0;
                        line-height: 1.2;
                    }
                    .header p {
                        margin-top: 8px;
                        font-size: 1rem;
                        color: #4f46e5; 
                        opacity: 0.9;
                    }
                    
                    /* Form Card */
                    .form-card {
                        padding: 20px;
                        background-color: white;
                        border-radius: 16px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 1px solid #e5e7eb;
                        margin: 0 auto 32px auto;
                        max-width: 700px; /* Optimal reading width for forms */
                    }
                    .form-group {
                        margin-bottom: 24px;
                    }
                    .form-label {
                        display: block;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 8px;
                    }
                    .text-input {
                        width: 100%;
                        padding: 12px 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 10px;
                        box-sizing: border-box;
                        font-size: 1rem;
                        transition: all 0.2s;
                        background-color: #f9fafb;
                    }
                    .text-input:focus {
                        border-color: #6366f1; 
                        background-color: white;
                        outline: none;
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                    }
                    
                    /* Radio Buttons */
                    .radio-group {
                        display: flex;
                        flex-wrap: wrap; 
                        gap: 12px;
                    }
                    .radio-label {
                        display: inline-flex;
                        align-items: center;
                        cursor: pointer;
                        padding: 10px 16px;
                        background-color: white;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        transition: all 0.2s;
                    }
                    .radio-label:hover {
                         border-color: #6366f1;
                         background-color: #eef2ff;
                    }
                    .radio-label:has(input:checked) {
                        border-color: #4f46e5;
                        background-color: #e0e7ff;
                        color: #312e81;
                    }
                    .radio-label span { 
                        color: inherit; 
                        font-size: 1rem;
                        font-weight: 500;
                        margin-left: 8px;
                    }
                    .radio-input {
                        margin: 0;
                        color: #4f46e5;
                        width: 16px;
                        height: 16px;
                        accent-color: #4f46e5;
                    }

                    /* Button */
                    .btn-submit {
                        width: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 16px;
                        border: none;
                        border-radius: 10px;
                        font-size: 1.125rem;
                        font-weight: 600;
                        color: white;
                        box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
                        transition: all 0.2s;
                        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                        cursor: pointer;
                    }
                    .btn-submit:hover:not(:disabled) {
                        transform: translateY(-1px);
                        box-shadow: 0 8px 12px rgba(79, 70, 229, 0.3);
                    }
                    .btn-submit:active:not(:disabled) {
                        transform: translateY(0);
                    }
                    .btn-submit:disabled {
                        background: #9ca3af;
                        cursor: not-allowed;
                        box-shadow: none;
                    }
                    .loader-icon {
                        margin-right: 10px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    /* Error Display */
                    .error-message {
                        margin: 24px auto;
                        padding: 16px;
                        background-color: #fee2e2; 
                        border-left: 4px solid #ef4444; 
                        color: #b91c1c; 
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-weight: 500;
                        max-width: 700px;
                    }

                    /* Recipe Card */
                    .recipe-card {
                        padding: 24px;
                        background-color: white;
                        border-radius: 16px;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e0e7ff; 
                        margin: 32px auto 0 auto;
                        max-width: 1000px; /* Wider for results */
                        animation: fadeIn 0.6s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .recipe-header {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        margin-bottom: 24px;
                        padding-bottom: 24px;
                        border-bottom: 1px solid #f3f4f6; 
                    }
                    .icon-header {
                        color: #4f46e5;
                        background: #eef2ff;
                        padding: 12px;
                        border-radius: 12px; 
                    }
                    .recipe-name {
                        font-size: 1.8rem;
                        font-weight: 800;
                        color: #111827; 
                        margin: 0;
                        line-height: 1.1;
                    }
                    .recipe-description {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        color: #4b5563;
                        margin-bottom: 24px;
                        font-style: italic;
                    }
                    .recipe-time {
                         display: inline-flex;
                         align-items: center;
                         background: #f3f4f6;
                         padding: 6px 12px;
                         border-radius: 20px;
                         font-size: 0.9rem;
                         color: #374151;
                         font-weight: 500;
                    }

                    .recipe-details-grid {
                        display: grid;
                        gap: 24px;
                        grid-template-columns: 1fr; 
                    }
                    
                    .ingredients-box, .instructions-box {
                        padding: 24px;
                        border-radius: 12px;
                        height: fit-content;
                    }
                    .ingredients-box {
                        background-color: #f5f3ff; /* Softer violet */
                        border: 1px solid #ddd6fe;
                    }
                    .instructions-box {
                        background-color: #fffbeb; /* Softer yellow */
                         border: 1px solid #fde68a;
                    }
                    .details-title {
                        display: flex;
                        align-items: center;
                        font-size: 1.25rem;
                        font-weight: 700;
                        padding-bottom: 12px;
                        margin-bottom: 16px;
                        border-bottom: 2px solid rgba(0,0,0,0.05);
                    }
                    .ingredients-box .details-title { color: #5b21b6; }
                    .instructions-box .details-title { color: #92400e; }
                    
                    .details-list {
                        padding-left: 20px;
                        margin: 0;
                        color: #374151; 
                    }
                    .details-list li {
                        margin-bottom: 12px;
                        font-size: 1rem;
                        line-height: 1.6;
                    }

                    /* Placeholder */
                    .placeholder {
                        margin: 40px auto;
                        padding: 40px 20px;
                        text-align: center;
                        background-color: rgba(255,255,255,0.5);
                        border-radius: 12px;
                        border: 2px dashed #cbd5e1; 
                        color: #64748b; 
                        max-width: 600px;
                    }
                    
                    /* === RESPONSIVE QUERIES === */
                    
                    /* Tablet */
                    @media (min-width: 640px) {
                        .app-container {
                            padding: 40px 24px;
                        }
                    }

                    /* Laptop / Desktop */
                    @media (min-width: 1024px) {
                         .app-container {
                            padding: 40px 40px;
                         }
                         .header h1 {
                            font-size: 3rem;
                         }
                         .recipe-header {
                            flex-direction: row;
                            align-items: center;
                         }
                         .recipe-name {
                            font-size: 2.5rem;
                         }
                         
                         .recipe-details-grid {
                            grid-template-columns: 1fr 1.5fr; /* 2 columns: Ingredients narrower than Instructions */
                            gap: 40px;
                         }
                         
                         .ingredients-box, .instructions-box {
                            padding: 32px;
                         }
                    }
                `}
            </style>

            <div className="main-content">

                <header className="header">
                    <h1>AI Personalized Recipe Chef</h1>
                    <p>Answer a few questions and let Gemini whip up a custom dish for you.</p>
                </header>

                {/* Question Form Card */}
                <div className="form-card">
                    <form onSubmit={(e) => { e.preventDefault(); generateRecipe(); }}>

                        {/* Ingredients */}
                        <div className="form-group">
                            <label htmlFor="ingredients" className="form-label">
                                1. What main ingredients do you have? (e.g., Chicken breast, rice, broccoli)
                            </label>
                            <input
                                type="text"
                                id="ingredients"
                                name="ingredients"
                                value={answers.ingredients}
                                onChange={handleChange}
                                className="text-input"
                                placeholder="List your ingredients here..."
                            />
                        </div>

                        {/* Diet Type (Veg/Non-Veg) */}
                        <div className="form-group">
                            <label className="form-label">
                                2. Dietary Preference (Veg or Non-Veg)?
                            </label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="diet"
                                        value="veg"
                                        checked={answers.diet === 'veg'}
                                        onChange={handleChange}
                                        className="radio-input"
                                    />
                                    <span>Vegetarian (🌱)</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="diet"
                                        value="non-veg"
                                        checked={answers.diet === 'non-veg'}
                                        onChange={handleChange}
                                        className="radio-input"
                                    />
                                    <span>Non-Vegetarian (🥩)</span>
                                </label>
                            </div>
                        </div>

                        {/* Fat Type (Butter/Oil) */}
                        <div className="form-group">
                            <label className="form-label">
                                3. Preferred Cooking Fat?
                            </label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="fatType"
                                        value="oil"
                                        checked={answers.fatType === 'oil'}
                                        onChange={handleChange}
                                        className="radio-input"
                                    />
                                    <span>Oil</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="fatType"
                                        value="butter"
                                        checked={answers.fatType === 'butter'}
                                        onChange={handleChange}
                                        className="radio-input"
                                    />
                                    <span>Butter</span>
                                </label>
                            </div>
                        </div>

                        {/* Allergies */}
                        <div className="form-group">
                            <label htmlFor="allergies" className="form-label">
                                4. Any Allergies to Avoid? (e.g., Nuts, Gluten, Dairy)
                            </label>
                            <input
                                type="text"
                                id="allergies"
                                name="allergies"
                                value={answers.allergies}
                                onChange={handleChange}
                                className="text-input"
                                placeholder="Leave blank if none"
                            />
                        </div>

                        {/* Special Request */}
                        <div className="form-group">
                            <label htmlFor="specialRequest" className="form-label">
                                5. Special Request? (e.g., 'Make it spicy', 'Ready in 30 minutes', 'High protein')
                            </label>
                            <input
                                type="text"
                                id="specialRequest"
                                name="specialRequest"
                                value={answers.specialRequest}
                                onChange={handleChange}
                                className="text-input"
                                placeholder="Optional style or time constraints"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-submit"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="loader-icon" />
                                    Whipping up your recipe...
                                </>
                            ) : (
                                'Generate Recipe'
                            )}
                        </button>
                    </form>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                        <p>{error}</p>
                    </div>
                )}

                {/* Recipe Output */}
                {recipe && renderRecipeCard(recipe)}

                {/* Initial Placeholder or Loading state */}
                {!recipe && !isLoading && !error && (
                    <div className="placeholder">
                        <CookingPot size={40} className="placeholder-icon" />
                        <p>Fill out the form above and click "Generate Recipe" to see your custom dish!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;