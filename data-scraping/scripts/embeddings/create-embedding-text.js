/**
 * Creates rich, descriptive text for embedding generation from app metadata
 * Combines multiple sources of information to capture app's purpose and functionality
 */

export function createEmbeddingText(app) {
  const parts = [];
  
  // 1. App name (most important for matching)
  if (app.title || app.name) {
    parts.push(`App: ${app.title || app.name}`);
  }
  
  // 2. Primary category (helps with classification)
  if (app.category || app.primary_category) {
    parts.push(`Category: ${app.category || app.primary_category}`);
  }
  
  // 3. Short description (concise overview)
  if (app.short_description && app.short_description.trim()) {
    parts.push(app.short_description.trim());
  }
  
  // 4. Full description (detailed functionality) - truncated to avoid token limits
  if (app.description && app.description.trim()) {
    // Clean up description text
    let description = app.description
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
    
    // Truncate to keep under token limits (Gemini has 32K context, but keep reasonable)
    description = description.substring(0, 2000);
    parts.push(description);
  }
  
  // 5. Additional categories/genres (if available)
  if (app.all_categories && Array.isArray(app.all_categories) && app.all_categories.length > 0) {
    const additionalCategories = app.all_categories
      .filter(cat => cat !== app.primary_category)  // Exclude primary category
      .slice(0, 3)  // Limit to top 3
      .join(', ');
    
    if (additionalCategories) {
      parts.push(`Also in: ${additionalCategories}`);
    }
  }
  
  // 6. Developer name (can indicate app type/quality)
  if (app.developer || app.developer_name) {
    const dev = (app.developer || app.developer_name).trim();
    if (dev) parts.push(`Developer: ${dev}`);
  }
  
  // 7. Key features (if extracted)
  if (app.key_features && Array.isArray(app.key_features) && app.key_features.length > 0) {
    const features = app.key_features.slice(0, 5).join(', ');
    parts.push(`Features: ${features}`);
  }
  
  // 8. Rating context (helps with quality indication)
  if ((app.rating || app.rating_average) && app.rating_count) {
    const rating = parseFloat(app.rating || app.rating_average);
    const count = parseInt(app.rating_count);
    
    if (rating > 0 && count > 0) {
      let ratingContext = `Rated ${rating}/5`;
      if (count >= 1000) {
        ratingContext += ` (${Math.round(count/1000)}k reviews)`;
      } else if (count >= 100) {
        ratingContext += ` (${count} reviews)`;
      }
      parts.push(ratingContext);
    }
  }
  
  // 9. Price context (free vs paid can indicate app type)
  if (app.formatted_price) {
    if (app.formatted_price === 'Free' || app.formatted_price === '$0.00') {
      parts.push('Free app');
    } else {
      parts.push(`Paid app (${app.formatted_price})`);
    }
  }
  
  // Join with double newlines for clarity
  const text = parts.join('\n\n').trim();
  
  // Final length limit to ensure we don't exceed token limits
  return text.substring(0, 5000);
}

/**
 * Example output for a budget tracking app:
 * 
 * App: Mint - Budget Tracker
 * 
 * Category: Finance
 * 
 * Track your spending, create budgets, and achieve your financial goals
 * 
 * Mint is the free money manager and financial tracker app from the makers of 
 * TurboTax® that does it all. Pay bills, manage your budget, and track your 
 * credit score—all in one place. With Mint, you can organize your finances in 
 * one secure place and see everything at a glance.
 * 
 * Also in: Productivity, Lifestyle
 * 
 * Developer: Intuit Inc.
 * 
 * Features: Budget tracking, Bill reminders, Credit score monitoring, Bank sync, Expense categorization
 * 
 * Rated 4.6/5 (85k reviews)
 * 
 * Free app
 */

export function validateEmbeddingText(text) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, reason: 'Text is empty or not a string' };
  }
  
  if (text.trim().length < 10) {
    return { isValid: false, reason: 'Text too short (minimum 10 characters)' };
  }
  
  if (text.length > 10000) {
    return { isValid: false, reason: 'Text too long (maximum 10,000 characters)' };
  }
  
  return { isValid: true };
}

// Test function for development
export function testEmbeddingText() {
  const sampleApp = {
    name: "Mint - Budget Tracker",
    primary_category: "Finance", 
    short_description: "Track your spending, create budgets, and achieve your financial goals",
    description: "Mint is the free money manager and financial tracker app from the makers of TurboTax® that does it all. Pay bills, manage your budget, and track your credit score—all in one place. With Mint, you can organize your finances in one secure place and see everything at a glance.",
    all_categories: ["Finance", "Productivity", "Lifestyle"],
    developer_name: "Intuit Inc.",
    key_features: ["Budget tracking", "Bill reminders", "Credit score monitoring", "Bank sync", "Expense categorization"],
    rating_average: "4.6",
    rating_count: "85000",
    formatted_price: "Free"
  };
  
  const result = createEmbeddingText(sampleApp);
  console.log("Sample embedding text:");
  console.log("=".repeat(50));
  console.log(result);
  console.log("=".repeat(50));
  console.log(`Length: ${result.length} characters`);
  
  const validation = validateEmbeddingText(result);
  console.log(`Validation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
  if (!validation.isValid) {
    console.log(`Reason: ${validation.reason}`);
  }
  
  return result;
}

// Run test if file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmbeddingText();
}