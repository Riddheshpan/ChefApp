import React, { useState, useCallback } from 'react';
import { ChefHat, CookingPot, Timer, Utensils, AlertTriangle, Loader2 } from 'lucide-react';

// Configuration for the Gemini API call
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCOFdmxE-BQcYE3mgIVntMISighCCk6dHM";
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
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage = `API Error: ${errorJson.error.message} (${response.status})`;
                    }
                } catch (e) {
                    // Fallback to text if not JSON
                    if (errorText) errorMessage = `API Error: ${errorText} (${response.status})`;
                }
                throw new Error(errorMessage);
            }
            return response;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
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
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                    
                    /* === DESIGN SYSTEM === */
                    :root {
                        --primary: #4f46e5;      /* Indigo 600 */
                        --primary-hover: #4338ca; /* Indigo 700 */
                        --secondary: #ec4899;    /* Pink 500 */
                        --bg-color: #f8fafc;     /* Slate 50 */
                        --card-bg: #ffffff;
                        --text-main: #0f172a;    /* Slate 900 */
                        --text-muted: #64748b;   /* Slate 500 */
                        --border-color: #e2e8f0; /* Slate 200 */
                        
                        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                        --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                        
                        --radius-md: 12px;
                        --radius-lg: 16px;
                    }

                    /* === BASE POINTERS === */
                    .app-container {
                        min-height: 100vh;
                        background-color: var(--bg-color);
                        padding: 20px 16px;
                        font-family: 'Inter', sans-serif;
                        color: var(--text-main);
                        display: flex;
                        justify-content: center;
                    }

                    .main-content {
                        width: 100%;
                        max-width: 1200px;
                        margin: 0 auto;
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }

                    /* === RESPONSIVE LAYOUT === */
                    @media (min-width: 768px) {
                        .app-container { padding: 40px 32px; }
                        .main-content { gap: 40px; }
                    }
                    @media (min-width: 1024px) {
                        .app-container { padding: 60px 40px; }
                    }

                    /* === HEADER === */
                    .header {
                        text-align: center;
                        padding: 20px 0;
                        animation: fadeInDown 0.6s ease-out;
                    }
                    .header h1 {
                        font-size: 2.25rem;
                        font-weight: 800;
                        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin: 0 0 16px 0;
                        letter-spacing: -0.025em;
                        line-height: 1.1;
                    }
                    .header p {
                        font-size: 1.1rem;
                        color: var(--text-muted);
                        margin: 0 auto;
                        max-width: 600px;
                        line-height: 1.5;
                    }
                    @media (min-width: 768px) {
                        .header h1 { font-size: 3.5rem; }
                        .header p { font-size: 1.25rem; }
                    }

                    /* === FORM CARD === */
                    .form-card {
                        background: var(--card-bg);
                        border-radius: var(--radius-lg);
                        box-shadow: var(--shadow-lg);
                        padding: 24px;
                        border: 1px solid var(--border-color);
                        transition: transform 0.2s ease;
                        max-width: 800px;
                        margin: 0 auto;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    @media (min-width: 1024px) {
                        .form-card:hover { transform: translateY(-2px); }
                        .form-card { padding: 40px; }
                    }

                    .form-group { margin-bottom: 24px; }
                    
                    .form-label {
                        display: block;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: var(--text-main);
                        margin-bottom: 8px;
                    }

                    .text-input {
                        width: 100%;
                        padding: 14px 16px;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius-md);
                        font-size: 1rem;
                        transition: all 0.2s;
                        background-color: #f8fafc;
                        color: var(--text-main);
                        box-sizing: border-box;
                    }
                    .text-input:focus {
                        border-color: var(--primary);
                        background-color: white;
                        outline: none;
                        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
                    }

                    /* Radio Grid */
                    .radio-group {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    @media (min-width: 500px) {
                        .radio-group { grid-template-columns: repeat(2, 1fr); }
                    }

                    .radio-label {
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        padding: 12px 16px;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius-md);
                        transition: all 0.2s;
                        background-color: white;
                    }
                    .radio-label:hover {
                        border-color: var(--primary);
                        background-color: #eef2ff;
                    }
                    .radio-label:has(input:checked) {
                        border-color: var(--primary);
                        background-color: #eef2ff;
                        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
                    }
                    .radio-input {
                        margin-right: 12px;
                        accent-color: var(--primary);
                        width: 18px;
                        height: 18px;
                    }
                    .radio-label span { font-weight: 500; }

                    /* Button */
                    .btn-submit {
                        width: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 16px;
                        border: none;
                        border-radius: var(--radius-md);
                        font-size: 1.1rem;
                        font-weight: 700;
                        color: white;
                        background: radial-gradient(circle at top left, var(--primary), var(--primary-hover));
                        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .btn-submit:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 16px rgba(79, 70, 229, 0.4);
                    }
                    .btn-submit:active:not(:disabled) { transform: translateY(0); }
                    .btn-submit:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        background: var(--text-muted);
                    }

                    /* === RECIPE CARD === */
                    .recipe-card {
                        background: white;
                        border-radius: var(--radius-lg);
                        box-shadow: var(--shadow-xl);
                        border: 1px solid var(--border-color);
                        overflow: hidden;
                        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                        width: 100%;
                    }
                    
                    .recipe-header {
                        padding: 24px;
                        background: linear-gradient(to right, #e0e7ff, #fae8ff);
                        border-bottom: 1px solid #e0e7ff;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    @media (min-width: 768px) {
                        .recipe-header {
                            padding: 32px;
                            flex-direction: row;
                            align-items: center;
                        }
                    }

                    .recipe-name {
                        font-size: 1.75rem;
                        font-weight: 800;
                        color: #1e1b4b;
                        margin: 0;
                        line-height: 1.1;
                    }
                    @media (min-width: 768px) { .recipe-name { font-size: 2.5rem; } }

                    .recipe-content-body { padding: 24px; }
                    @media (min-width: 1024px) { .recipe-content-body { padding: 40px; } }

                    .recipe-description {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        color: var(--text-main);
                        margin-bottom: 24px;
                        font-style: italic;
                    }

                    /* Recipe Grid - Laptop Optimized */
                    .recipe-details-grid {
                        display: grid;
                        gap: 24px;
                        grid-template-columns: 1fr;
                    }
                    @media (min-width: 900px) {
                        .recipe-details-grid {
                            grid-template-columns: 1fr 1.5fr; /* Ingredients left, Instructions right */
                            gap: 32px;
                        }
                    }

                    .ingredients-box, .instructions-box {
                        padding: 24px;
                        border-radius: var(--radius-md);
                        border: 1px solid transparent;
                    }
                    .ingredients-box {
                        background-color: #f5f3ff;
                        border-color: #e0e7ff;
                    }
                    .instructions-box {
                        background-color: #fffbeb;
                        border-color: #fef3c7;
                    }

                    .details-title {
                        display: flex;
                        align-items: center;
                        font-size: 1.25rem;
                        font-weight: 700;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 2px solid rgba(0,0,0,0.05);
                    }
                    .ingredients-box .details-title { color: var(--primary); }
                    .instructions-box .details-title { color: #b45309; }

                    .details-list li {
                        margin-bottom: 10px;
                        line-height: 1.5;
                        padding-left: 8px;
                    }
                    
                    /* Utilities */
                    .text-center { text-align: center; }
                    .hidden { display: none; }

                    /* Animations */
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .loader-icon { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }

                    .error-message {
                        background-color: #fef2f2;
                        border: 1px solid #fee2e2;
                        color: #991b1b;
                        padding: 16px;
                        border-radius: var(--radius-md);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-top: 24px;
                        font-weight: 500;
                    }
                    
                    .placeholder {
                        margin-top: 40px;
                        padding: 40px;
                        text-align: center;
                        border: 2px dashed var(--border-color);
                        border-radius: var(--radius-lg);
                        color: var(--text-muted);
                        background: #f8fafc;
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
                                1. What main ingredients do you have? (e.g., rice, broccoli)
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