#!/usr/bin/env python3

import json
import csv

# Read the JSON file
with open('plant_search_results.json', 'r') as f:
    data = json.load(f)

# Extract all plant apps
all_plant_apps = data['all_plant_apps']
top_10_results = data['top_10_results']

print(f"Total plant apps found: {len(all_plant_apps)}")
print(f"Top 10 results: {len(top_10_results)}")

# Create a set of top 10 app IDs for easy lookup
top_10_ids = set(str(app['id']) for app in top_10_results)

# Prepare CSV data
csv_data = []

for app in all_plant_apps:
    is_in_top_10 = str(app['id']) in top_10_ids
    
    # Get matched keywords if in top 10
    matched_keywords = ""
    relevance_score = ""
    match_reason = ""
    
    if is_in_top_10:
        # Find the corresponding top 10 result
        for top_app in top_10_results:
            if str(top_app['id']) == str(app['id']):
                matched_keywords = ", ".join(top_app.get('matched_keywords', []))
                relevance_score = top_app.get('relevance_score', '')
                match_reason = top_app.get('match_reason', '')
                break
    
    csv_data.append({
        'app_id': app['id'],
        'app_name': app['name'],
        'category': app['category'],
        'rating': app['rating'],
        'one_liner': app['one_liner'],
        'in_top_10': 'YES' if is_in_top_10 else 'NO',
        'matched_keywords': matched_keywords,
        'relevance_score': relevance_score,
        'match_reason': match_reason,
        'description_preview': app['description'][:200] + '...' if len(app['description']) > 200 else app['description']
    })

# Sort by whether in top 10 first, then by rating
csv_data.sort(key=lambda x: (x['in_top_10'] == 'NO', -float(x['rating']) if x['rating'] else 0))

# Write to CSV
with open('plant_apps_analysis.csv', 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['app_id', 'app_name', 'category', 'rating', 'one_liner', 'in_top_10', 
                  'matched_keywords', 'relevance_score', 'match_reason', 'description_preview']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    
    writer.writeheader()
    writer.writerows(csv_data)

print("\nCSV file created: plant_apps_analysis.csv")
print(f"\nApps in top 10: {sum(1 for app in csv_data if app['in_top_10'] == 'YES')}")
print(f"Apps not in top 10: {sum(1 for app in csv_data if app['in_top_10'] == 'NO')}")

# Show first 10 apps (top 10 results)
print("\n=== TOP 10 ALGORITHM RESULTS ===")
for i, app in enumerate([app for app in csv_data if app['in_top_10'] == 'YES'][:10]):
    print(f"{i+1:2d}. {app['app_name']}")
    print(f"    Category: {app['category']} | Rating: {app['rating']}")
    print(f"    Keywords: {app['matched_keywords']}")
    print(f"    One-liner: {app['one_liner']}")
    print()