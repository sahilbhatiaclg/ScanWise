# ScanWise : Smarter insights for everyday products.

### Scan it. Understand it. Choose wisely.

ScanWise is a mobile-first web application that helps users understand
everyday products by scanning the information printed on the back of the
product. It extracts ingredients and other useful product information,
checks the data against a structured database, and presents simple
visual insights that are easier to understand than a traditional product
label.

The project is focused on building a realistic 20-day MVP with five core
features.

------------------------------------------------------------------------

## 1. Problem Statement

Everyday products such as packaged food, shampoo, skincare, haircare and
personal-care products contain detailed ingredient lists, nutrition
information, certifications and other claims.

Although this information is available on the packaging, it is often
difficult for normal users to understand because of:

-   Complex ingredient names
-   Small and dense labels
-   Difficult nutrition information
-   Unclear product claims
-   Lack of simple explanations
-   Difficulty identifying ingredients that may be relevant to the user

ScanWise aims to make this information easier to understand without
requiring users to research every ingredient themselves.

------------------------------------------------------------------------

## 2. Proposed Solution

The user captures the back side of a product using their mobile camera.

ScanWise then:

1.  Processes the captured image.
2.  Extracts readable text using OCR.
3.  Identifies ingredients and other useful information.
4.  Checks known information against the application's database.
5.  Analyzes the product according to predefined rules and the user's
    basic preferences.
6.  Uses Gemini when an ingredient or explanation requires AI
    assistance.
7.  Presents the result as a simple visual product report.

### Core Principle

> **Database and rule-based analysis first, AI explanation second.**

AI should not be responsible for deciding every product fact. Known
information should come from structured data and predefined analysis
rules, while Gemini is mainly used for unknown ingredients and
human-friendly explanations.

------------------------------------------------------------------------

## 3. Project Scope

### MVP Duration

**20 days**

### Development Level

Student-level MVP / prototype with a practical and achievable scope.

### Primary Platform

**Mobile-first web application**

The application will run through a mobile browser instead of requiring a
native Android or iOS application.

------------------------------------------------------------------------

## 4. Five Core Features

### 1. Product Label Scanning

Users can use their mobile camera to capture the back label of a
product.

The first MVP approach will focus on image capture rather than
implementing a complete barcode-scanning system.

### 2. Ingredient & Information Extraction

OCR will extract information from the captured image, such as:

-   Ingredients
-   Nutrition information
-   Product name
-   Manufacturer
-   Country/origin information
-   Certifications or visible claims

The extracted text will then be structured into usable fields.

### 3. Ingredient Analysis

Extracted ingredients will be checked against the ScanWise database.

The system can identify:

-   Known ingredients
-   Ingredient category/function
-   Basic risk or concern level
-   Allergens
-   Ingredients requiring further explanation

Unknown ingredients can be sent to Gemini for additional explanation and
then stored for future use where appropriate.

### 4. Personalized Product Insights

Users can provide basic information and preferences during onboarding.

Examples include:

-   Age group
-   Dietary preferences
-   Allergies/preferences
-   Basic skin or product preferences where relevant

The system uses this information to highlight insights that are more
relevant to the individual user.

### 5. Visual Product Report

The final result will be presented in a simple mobile-friendly format
rather than a long technical explanation.

The report can contain:

-   Overall product score
-   Important positives
-   Important warnings
-   Ingredient highlights
-   Nutrition highlights
-   Certification information
-   AI explanation where required
-   Basic suitability information

------------------------------------------------------------------------

## 5. Basic User Flow

``` text
Open ScanWise
      |
      v
Login / Register
      |
      v
Basic Profile Setup
      |
      v
Home Screen
      |
      v
Scan Product Label
      |
      v
Capture Image
      |
      v
Image Processing
      |
      v
OCR
      |
      v
Extract & Structure Information
      |
      v
Check ScanWise Database
      |
      +-----------------------+
      |                       |
      v                       v
Information Found       Information Missing
      |                       |
      |                       v
      |                  Gemini API
      |                       |
      |                       v
      |                 Store Explanation
      |                       |
      +-----------+-----------+
                  |
                  v
          Product Analysis
                  |
                  v
        Personalization Layer
                  |
                  v
          Visual Product Report
                  |
                  v
             Save History
```

------------------------------------------------------------------------

## 6. Backend Processing Flow

``` text
Mobile Web App
      |
      v
Flask Backend
      |
      v
Image Processing
      |
      v
OCR Service
      |
      v
Information Extraction
      |
      v
Database Lookup
      |
      +-----------------------+
      |                       |
      v                       v
Known Information       Unknown Information
      |                       |
      |                       v
      |                  Gemini API
      |                       |
      |                       v
      |                  Store Result
      |                       |
      +-----------+-----------+
                  |
                  v
           Analysis Engine
                  |
                  v
       Personalization Engine
                  |
                  v
       Visual Report Generator
                  |
                  v
             JSON Response
                  |
                  v
             Frontend UI
```

------------------------------------------------------------------------

## 7. Technology Stack

### Frontend

-   HTML
-   CSS
-   JavaScript

The frontend will be kept simple because the project has a 20-day
development limit. The main focus is a responsive mobile-first
experience.

### Backend

-   Python
-   Flask
-   SQLAlchemy

Flask will handle:

-   API routes
-   Image processing workflow
-   OCR integration
-   Database communication
-   Product analysis
-   Authentication-related backend logic
-   Gemini API integration

### Database

#### Development

**SQLite 3**

Used for local development because it is lightweight and easy to set up.

#### Deployment

**Azure SQL Database**

The application can be moved to Azure SQL when deploying the cloud
version.

SQLAlchemy will be used so that the backend database layer remains
easier to manage when moving from SQLite to Azure SQL.

### AI

**Gemini API**

Gemini will mainly be used for:

-   Explaining unknown ingredients
-   Converting technical information into understandable language
-   Generating concise product explanations

### OCR

An OCR service/API will be used to extract text from captured product
images.

The exact OCR provider will be finalized during the TRD stage.

### Cloud

**Microsoft Azure**

Azure will be used for cloud deployment and data services as the project
progresses.

------------------------------------------------------------------------

## 8. Database Concept

The initial database will contain structured information around:

``` text
Users
Products
Ingredients
Ingredient Information
Certifications
Scan History
User Preferences
```

A simplified relationship can be represented as:

``` text
User
 |
 +---- Scan History
 |
 +---- Preferences
 |
 v
Products
 |
 +---- Ingredients
 |
 +---- Certifications
```

SQLite 3 will be used during development and Azure SQL is planned for
the cloud/deployed version.

------------------------------------------------------------------------

## 9. AI Strategy

ScanWise will not send every piece of information directly to Gemini.

The intended approach is:

``` text
OCR
  |
  v
Extract Ingredient
  |
  v
Database Lookup
  |
  +---- Found ------> Use Stored Information
  |
  +---- Not Found --> Gemini
                         |
                         v
                  Store Useful Result
```

This approach is intended to:

-   Reduce unnecessary API calls
-   Reduce cost
-   Improve response consistency
-   Keep known information under project control
-   Make the system easier to debug

Gemini will act mainly as an **intelligent explanation layer**, not as
the sole source of truth.

------------------------------------------------------------------------

## 10. Project Documentation Workflow

Development will begin only after the initial project documentation is
prepared.

The project will maintain three main technical documents:

``` text
PRD
 |
 | Defines WHAT and WHY
 v
TRD
 |
 | Defines HOW the system will be built
 v
SRD
 |
 | Defines detailed software requirements
 v
Development
 |
 v
Testing
 |
 v
Deployment
```

### PRD --- Product Requirements Document

The PRD defines:

-   Problem
-   Target users
-   Product vision
-   Features
-   User flow
-   Scope
-   MVP requirements
-   Future scope

### TRD --- Technical Requirements Document

The TRD will define:

-   Technical architecture
-   Frontend architecture
-   Backend architecture
-   Database design
-   API architecture
-   OCR integration
-   Gemini integration
-   Authentication approach
-   Azure services
-   Development environment
-   Deployment approach

### SRD --- Software Requirements Document

The SRD will convert the product requirements into detailed software
requirements, including:

-   Functional requirements
-   Non-functional requirements
-   User requirements
-   System requirements
-   API requirements
-   Database requirements
-   Security requirements
-   Error handling
-   Testing requirements

### Development

Coding will begin after the PRD, TRD and SRD have been reviewed and the
MVP scope has been finalized.

------------------------------------------------------------------------

## 11. 20-Day Development Strategy

The project will be divided into small milestones rather than attempting
the complete PRD at once.

### Phase 1 --- Documentation & Planning

**Day 1--2**

-   Finalize PRD
-   Prepare TRD
-   Prepare SRD
-   Finalize database schema
-   Finalize API requirements
-   Set up Git repository

### Phase 2 --- Project Foundation

**Day 3--4**

-   Flask backend setup
-   Frontend setup
-   SQLAlchemy setup
-   SQLite database
-   Basic API structure
-   Basic project UI

### Phase 3 --- Scanning & OCR

**Day 5--7**

-   Mobile camera interface
-   Image capture
-   Image upload
-   OCR integration
-   Extract raw text

### Phase 4 --- Product Information

**Day 8--10**

-   Ingredient extraction
-   Structured product data
-   Ingredient database
-   Certification data
-   Nutrition data structure

### Phase 5 --- Analysis

**Day 11--13**

-   Ingredient lookup
-   Basic rule-based analysis
-   Allergen/concern detection
-   Basic product scoring
-   User preference matching

### Phase 6 --- Gemini Integration

**Day 14--15**

-   Unknown ingredient detection
-   Gemini API integration
-   Human-readable explanations
-   AI response validation

### Phase 7 --- Result UI

**Day 16--17**

-   Product result screen
-   Score display
-   Warning cards
-   Ingredient cards
-   Personalized insights
-   Scan history

### Phase 8 --- Testing & Deployment

**Day 18--20**

-   End-to-end testing
-   Fix major bugs
-   Mobile responsiveness
-   Security/basic validation
-   Azure deployment preparation
-   Final demonstration

------------------------------------------------------------------------

## 12. Initial Project Structure

The structure will be kept simple enough for a 20-day project.

``` text
ScanWise/
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── scan.py
│   │   ├── products.py
│   │   └── users.py
│   │
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── ingredient_service.py
│   │   ├── analysis_service.py
│   │   └── gemini_service.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── ingredient.py
│   │   └── scan.py
│   │
│   └── utils/
│
├── database/
│   └── seed_data/
│
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── SRD.md
│
├── tests/
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

This structure can be simplified further if development starts falling
behind schedule.

------------------------------------------------------------------------

## 13. Development Philosophy

Because ScanWise has a strict 20-day deadline, the project will follow
these principles:

### Build the MVP first

A working simple feature is more valuable than an unfinished advanced
feature.

### Avoid unnecessary complexity

The first version will not use microservices, Kubernetes, complex vector
databases or advanced ML systems.

### Database before AI

Known information should come from structured data wherever possible.

### AI only where it adds value

Gemini should be used for explanations and unknown information rather
than replacing the entire backend logic.

### Mobile-first

The main user experience will be designed for a smartphone because
scanning happens while users are shopping.

### Test continuously

Each feature should be tested immediately after implementation rather
than leaving all testing to Day 20.

------------------------------------------------------------------------

## 14. Current MVP Scope

### Included

-   Mobile-first web interface
-   Basic authentication
-   Product image capture
-   OCR
-   Ingredient extraction
-   Ingredient database
-   Basic product analysis
-   User preferences
-   Personalized insights
-   Gemini explanations
-   Visual product report
-   Basic scan history
-   SQLite 3 development database
-   Azure deployment/data services preparation

### Not part of the initial 20-day MVP

-   Native Android/iOS application
-   Complex RAG architecture
-   Pinecone/vector database
-   Kubernetes
-   Microservices
-   Advanced recommendation ML
-   Community system
-   Payment/subscription system
-   Counterfeit detection
-   Full offline database
-   Voice assistant
-   Large-scale analytics
-   Advanced sustainability engine

These can be considered for future versions.

------------------------------------------------------------------------

## 15. Future Scope

After the MVP, ScanWise can be extended with:

-   Barcode scanning
-   Product comparison
-   Alternative product recommendations
-   Advanced AI shopping assistant
-   Voice search
-   Better OCR/image recognition
-   Sustainability analysis
-   Community contributions
-   Product recall notifications
-   Multilingual support
-   Native mobile applications
-   Advanced cloud infrastructure

------------------------------------------------------------------------

## 16. Project Goal

The goal of the 20-day project is not to build the complete long-term
vision.

The goal is to prove the core idea:

> **A user can scan a product label and quickly understand what is
> inside the product and whether it is relevant to them.**

If this core experience works reliably, additional features can be built
around it later.

------------------------------------------------------------------------

## 17. Project Status

**Current Stage:** Documentation & Planning

**Next Steps:**

1.  Finalize PRD
2.  Create TRD
3.  Create SRD
4.  Finalize database schema
5.  Finalize API contracts
6.  Set up Git repository
7.  Begin backend foundation
8.  Begin frontend foundation

------------------------------------------------------------------------

## 18. License

This project is currently being developed as an academic/student
project. Licensing will be finalized before public production release.
