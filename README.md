# ChefApp 🍳

A streamlined application designed for culinary management, recipe organization, and kitchen efficiency.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before installing, ensure you have the following tools installed:
* **Flutter SDK** (or your specific framework runtime)
* **Git**
* A code editor like **VS Code** or **Android Studio**

### Installation Guide

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Riddheshpan/ChefApp.git](https://github.com/Riddheshpan/ChefApp.git)
   ```
2. **Install the dependency **
   ```bash
   npm install
   ```
3. **Environment setup**
   create a .env file in the root file add the following
   ```bash
   DATABASE_URL=your_db_url
   API_KEY=your_api_key
   ```
4. **Run the application**
   ```bash
   npm start
   ```
### Folder Structure
    ChefApp/
    ├── assets/             # Images, icons, and static fonts
    ├── lib/ or src/        # Main application source code
    │   ├── api/            # API service calls and network configurations
    │   ├── components/     # Reusable UI widgets/components
    │   ├── models/         # Data structures and classes
    │   ├── screens/        # Full-page UI views (Home, Login, RecipeDetail)
    │   ├── utils/          # Helper functions and constants
    │   └── main.dart / app.js # Application entry point
    ├── test/               # Unit and integration tests
    ├── .gitignore          # Files to be ignored by Git
    ├── pubspec.yaml / package.json # Project dependencies and metadata
    └── README.md           # Project documentation
### Features
- Recipe Management: Create, edit, and delete your personal recipes

- Inventory Tracking: Keep track of your pantry items in real-time

- Meal Planning: Schedule your meals for the week with an integrated calendar

- Search & Filter: Easily find recipes based on ingredients or dietary restrictions
