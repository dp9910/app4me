/**
 * Problem Query Test Suite
 * Protects the working weighted search system by capturing expected behavior
 */

const { MasterPipeline } = require('./master-pipeline');
const fs = require('fs');

class ProblemQueryTester {
  constructor() {
    this.pipeline = new MasterPipeline();
    this.testResults = [];
  }

  /**
   * Test queries we know work well
   */
  async runComprehensiveTests() {
    console.log('🧪 PROBLEM QUERY TEST SUITE');
    console.log('=' .repeat(80));
    console.log('🛡️ Protecting working functionality with baseline testing\n');

    const testQueries = [
      {
        query: "i cant sleep properly, maybe too much coffee or phone",
        description: "Sleep problem with multiple causes (coffee + phone)",
        expectedDomain: "sleep",
        expectedTopApp: "Pillow: Sleep Tracker",
        minResults: 15,
        maxTime: 10000 // 10 seconds
      },
      {
        query: "i cant sleep, maybe too much phone usage",
        description: "Sleep problem with phone usage cause",
        expectedDomain: "sleep", 
        expectedTopApp: "Pillow: Sleep Tracker",
        minResults: 15,
        maxTime: 8000
      },
      {
        query: "i cant sleep properly, maybe too much coffee",
        description: "Sleep problem with caffeine cause",
        expectedDomain: "sleep",
        expectedApps: ["Pillow: Sleep Tracker", "Caffeine Tracker"],
        minResults: 10,
        maxTime: 8000
      },
      {
        query: "cant sleep at night, too stressed",
        description: "Sleep problem with stress cause",
        expectedDomain: "sleep",
        minResults: 10,
        maxTime: 8000
      }
    ];

    console.log(`📝 Testing ${testQueries.length} known working problem queries...\n`);

    for (let i = 0; i < testQueries.length; i++) {
      const testCase = testQueries[i];
      console.log(`🧪 TEST ${i + 1}/${testQueries.length}: ${testCase.description}`);
      console.log(`📝 Query: "${testCase.query}"`);
      console.log('-' .repeat(60));

      try {
        const startTime = Date.now();
        const result = await this.pipeline.runPipeline(testCase.query, {
          limit: 15,
          saveIntermediateFiles: true, // Need this for the pipeline to work properly
          showDetailedLogs: false // Reduce noise during testing
        });
        const endTime = Date.now();

        const testResult = this.analyzeTestResult(testCase, result, endTime - startTime);
        this.testResults.push(testResult);

        this.displayTestResult(testResult);

      } catch (error) {
        console.log(`❌ TEST FAILED: ${error.message}`);
        this.testResults.push({
          query: testCase.query,
          description: testCase.description,
          status: 'FAILED',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      console.log('\n');
    }

    this.generateTestReport();
    return this.testResults;
  }

  /**
   * Analyze test result against expectations
   */
  analyzeTestResult(testCase, result, executionTime) {
    const analysis = {
      query: testCase.query,
      description: testCase.description,
      status: 'UNKNOWN',
      executionTime,
      issues: [],
      successes: [],
      timestamp: new Date().toISOString()
    };

    // Check if pipeline succeeded
    if (result.error) {
      analysis.status = 'FAILED';
      analysis.issues.push(`Pipeline error: ${result.error}`);
      return analysis;
    }

    const finalResults = result.final_results?.results || [];
    analysis.resultCount = finalResults.length;
    analysis.topApps = finalResults.slice(0, 5).map(app => ({
      title: app.title,
      weighted_score: app.weighted_similarity || app.similarity_score,
      category: app.primary_category
    }));

    // Performance checks
    if (executionTime > testCase.maxTime) {
      analysis.issues.push(`Slow execution: ${executionTime}ms > ${testCase.maxTime}ms`);
    } else {
      analysis.successes.push(`Good performance: ${executionTime}ms`);
    }

    // Result count checks
    if (finalResults.length < testCase.minResults) {
      analysis.issues.push(`Too few results: ${finalResults.length} < ${testCase.minResults}`);
    } else {
      analysis.successes.push(`Sufficient results: ${finalResults.length}`);
    }

    // Domain detection checks
    const detectedDomain = result.steps.keyword_processing?.result?.processed_keywords?.primary_domain;
    if (testCase.expectedDomain && detectedDomain !== testCase.expectedDomain) {
      analysis.issues.push(`Wrong domain: expected ${testCase.expectedDomain}, got ${detectedDomain}`);
    } else if (testCase.expectedDomain) {
      analysis.successes.push(`Correct domain: ${detectedDomain}`);
    }

    // Specific app checks
    if (testCase.expectedTopApp) {
      const topApp = finalResults[0];
      if (!topApp || !topApp.title.includes(testCase.expectedTopApp.split(':')[0])) {
        analysis.issues.push(`Expected top app "${testCase.expectedTopApp}" not found at position 1`);
      } else {
        analysis.successes.push(`Found expected top app: ${topApp.title}`);
      }
    }

    if (testCase.expectedApps) {
      const foundApps = finalResults.slice(0, 10).map(app => app.title);
      testCase.expectedApps.forEach(expectedApp => {
        const found = foundApps.some(title => title.includes(expectedApp.split(':')[0]));
        if (!found) {
          analysis.issues.push(`Expected app "${expectedApp}" not found in top 10`);
        } else {
          analysis.successes.push(`Found expected app: ${expectedApp}`);
        }
      });
    }

    // Quality checks
    const avgScore = finalResults.reduce((sum, app) => sum + (app.weighted_similarity || app.similarity_score), 0) / finalResults.length;
    if (avgScore < 0.4) {
      analysis.issues.push(`Low average similarity: ${avgScore.toFixed(4)}`);
    } else {
      analysis.successes.push(`Good average similarity: ${avgScore.toFixed(4)}`);
    }

    // Sleep-specific checks for sleep queries
    if (testCase.expectedDomain === 'sleep') {
      const sleepApps = finalResults.filter(app => {
        const text = `${app.title} ${app.description || ''}`.toLowerCase();
        return text.includes('sleep') || text.includes('meditation') || text.includes('rest') || text.includes('pillow');
      });
      const sleepPercentage = (sleepApps.length / finalResults.length) * 100;
      
      if (sleepPercentage < 80) {
        analysis.issues.push(`Low sleep relevance: ${sleepPercentage.toFixed(1)}% sleep-related apps`);
      } else {
        analysis.successes.push(`High sleep relevance: ${sleepPercentage.toFixed(1)}%`);
      }
    }

    // Determine overall status
    analysis.status = analysis.issues.length === 0 ? 'PASSED' : 
                     analysis.successes.length > analysis.issues.length ? 'WARNING' : 'FAILED';

    return analysis;
  }

  /**
   * Display individual test result
   */
  displayTestResult(result) {
    const statusIcon = result.status === 'PASSED' ? '✅' : 
                       result.status === 'WARNING' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${result.status} (${result.executionTime}ms)`);
    
    if (result.successes.length > 0) {
      console.log('✅ Successes:');
      result.successes.forEach(success => console.log(`   • ${success}`));
    }
    
    if (result.issues.length > 0) {
      console.log('❌ Issues:');
      result.issues.forEach(issue => console.log(`   • ${issue}`));
    }

    if (result.topApps && result.topApps.length > 0) {
      console.log('🏆 Top Results:');
      result.topApps.forEach((app, i) => {
        console.log(`   ${i + 1}. ${app.title} (${app.weighted_score?.toFixed(4) || 'N/A'})`);
      });
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 FINAL TEST REPORT');
    console.log('=' .repeat(80));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    console.log(`\n📈 Overall Results:`);
    console.log(`   ✅ Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    console.log(`   ⚠️ Warnings: ${warnings}/${total} (${(warnings/total*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${failed}/${total} (${(failed/total*100).toFixed(1)}%)`);

    // Performance summary
    const executionTimes = this.testResults.map(r => r.executionTime).filter(t => t);
    if (executionTimes.length > 0) {
      const avgTime = executionTimes.reduce((a, b) => a + b) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);
      
      console.log(`\n⚡ Performance Summary:`);
      console.log(`   Average: ${avgTime.toFixed(0)}ms`);
      console.log(`   Range: ${minTime}ms - ${maxTime}ms`);
    }

    // Critical issues
    const criticalIssues = this.testResults.filter(r => r.status === 'FAILED');
    if (criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES:`);
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.description}: ${issue.error || issue.issues.join(', ')}`);
      });
    }

    // Save baseline results for future comparison
    const baselineData = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: { passed, warnings, failed, total },
      performance: executionTimes.length > 0 ? {
        average: executionTimes.reduce((a, b) => a + b) / executionTimes.length,
        min: Math.min(...executionTimes),
        max: Math.max(...executionTimes)
      } : null
    };

    fs.writeFileSync('./scripts/baseline-test-results.json', JSON.stringify(baselineData, null, 2));
    console.log('\n💾 Baseline results saved to scripts/baseline-test-results.json');
    
    // Overall assessment
    if (failed > 0) {
      console.log('\n🚨 BASELINE CAPTURE FAILED - Critical issues must be resolved before proceeding');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('\n⚠️ BASELINE CAPTURED with warnings - Proceed with caution');
    } else {
      console.log('\n✅ BASELINE SUCCESSFULLY CAPTURED - Safe to proceed with enhancements');
    }
  }

  /**
   * Compare against previous baseline (for regression testing)
   */
  async compareAgainstBaseline() {
    try {
      const baselineData = JSON.parse(fs.readFileSync('./scripts/baseline-test-results.json', 'utf8'));
      console.log('\n📊 REGRESSION TEST - Comparing against baseline');
      console.log('=' .repeat(60));

      // Run current tests
      await this.runComprehensiveTests();

      // Compare results
      const regressions = [];
      const improvements = [];

      this.testResults.forEach(current => {
        const baseline = baselineData.testResults.find(b => b.query === current.query);
        if (baseline) {
          if (current.status === 'FAILED' && baseline.status !== 'FAILED') {
            regressions.push(`${current.description}: ${baseline.status} → ${current.status}`);
          } else if (current.status === 'PASSED' && baseline.status !== 'PASSED') {
            improvements.push(`${current.description}: ${baseline.status} → ${current.status}`);
          }
        }
      });

      console.log('\n📈 REGRESSION ANALYSIS:');
      console.log(`   🚨 Regressions: ${regressions.length}`);
      console.log(`   ⬆️ Improvements: ${improvements.length}`);

      if (regressions.length > 0) {
        console.log('\n🚨 REGRESSIONS DETECTED:');
        regressions.forEach(reg => console.log(`   • ${reg}`));
        return false;
      }

      return true;

    } catch (error) {
      console.log('⚠️ No baseline found - creating new baseline');
      return await this.runComprehensiveTests();
    }
  }
}

// Test runner
async function runTests() {
  const tester = new ProblemQueryTester();
  
  if (process.argv.includes('--compare')) {
    // Run regression test
    await tester.compareAgainstBaseline();
  } else {
    // Run baseline capture
    await tester.runComprehensiveTests();
  }
}

// Export for use as module
module.exports = ProblemQueryTester;

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
}