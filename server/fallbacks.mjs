/**
 * High-fidelity, verified fallback responses for all 4 families.
 * Used whenever an AI model call fails, times out, or when running in pure offline demo mode.
 * Grounded 100% in Sherpas verified data from cases/
 */

export const CASE_FALLBACKS = {
  'timothy-melanie-weah': {
    initialQuestion: {
      question: "On a scale from 0 to 100, how healthy do you think your household finances really are?",
      category: "perceived_health",
      type: "slider",
      options: null
    },
    dynamicQuestions: [
      {
        trigger: 'high_confidence',
        question: "You mentioned feeling financially secure because of your cash reserves. When you look at that $150,000 sitting in the bank, what is that money specifically doing for you right now?",
        options: [
          "It makes us sleep at night as an emergency cushion",
          "We are planning for future renovations or purchases",
          "Honestly, we have just kept deferring where to put it",
          "We want to invest it but we disagree on the risk"
        ]
      },
      {
        trigger: 'debt_concern',
        question: "With an $18,000 credit card balance compounding at 18%, what has kept you from wiping it out using your existing cash cushion?",
        options: [
          "Melanie feels nervous if our liquid cash drops below six figures",
          "We pay more than the minimum so it didn't feel urgent",
          "We haven't sat down to align on a single payoff plan",
          "Other monthly expenses kept absorbing our free cash flow"
        ]
      }
    ],
    revealReaction: (expected, actual, gap) => {
      if (gap > 10) {
        return `You rated your financial health at ${expected}, but your official Sherpas score is ${actual}. That is a ${gap}-point reality check. You feel secure because you see $150,000 in your bank account, but your money is working against itself. While that cash sits idle earning modest interest, your $18,000 credit card is silently compounding at 18% interest—costing you over $270 a month just to tread water!`;
      }
      return `You estimated a score of ${expected}, and Sherpas clocks you at ${actual} (${gap >= 0 ? '+' : ''}${gap} gap). You have tremendous income and liquid assets, but an 18% credit card and an open $1.1M life insurance shortfall are dragging down an otherwise strong foundation.`;
    },
    discoveries: [
      {
        id: 'weah-disc-1',
        title: 'THE 18% PARADOX',
        figure: '$18,000 at 18.0% APR',
        source: 'Key Metrics — Debt Management & Cashflow Statement',
        explanation: 'You hold $150,800 in accessible liquid cash, but carry an $18,000 credit card balance at 18% APR. Your monthly payment of $300 sends $270 directly to interest charges, keeping you on a 12-year treadmill until 2039 unless restructured.',
        whyItMatters: 'Your cash above the full 9-month emergency reserve ($84,577) is over $60,000. Holding onto high-interest credit card debt when you have free cash is effectively paying 18% guaranteed penalty fees.',
        auditorRemark: 'Your savings are doing a heroic job sitting there. Your credit card, meanwhile, is working overtime against you. Let us stop paying the bank an 18% subscription fee for keeping cash in a checking account.',
        badge: 'FACT'
      },
      {
        id: 'weah-disc-2',
        title: 'THE $1,100,000 PROTECTION VOID',
        figure: '$1,100,000 Coverage Shortfall',
        source: 'Key Metrics — Life Insurance Coverage Analysis',
        explanation: 'Timothy has $140,000 in coverage (shortfall of $610,000) and Melanie has $110,000 in coverage (shortfall of $490,000). With Liam (6) and Josh (3) relying on both high incomes, existing coverage covers less than 1 year of earnings.',
        whyItMatters: 'If either earner experiences an unexpected life event, household cash flow would face an immediate deficit before Liam and Josh even reach middle school.',
        auditorRemark: 'You have protected your peace of mind with cash, but left your children unprotected against the one catastrophe cash cannot absorb alone.',
        badge: 'FACT'
      },
      {
        id: 'weah-disc-3',
        title: 'THE EMPTY 529 ACCOUNTS',
        figure: '$0 in 529 College Accounts',
        source: 'Key Metrics — Education Savings Gap ($113,508)',
        explanation: 'Liam enters college in August 2038 and Josh in August 2041. Total projected inflation-adjusted funding gap is $113,508.60, requiring $4,609/year in dedicated savings starting today.',
        whyItMatters: 'Every year of delay means college funding will collide with your peak retirement accumulation window.',
        auditorRemark: 'College seems far away until it is next August. Setting up the automatic contribution today is vastly cheaper than liquidating brokerage assets in 2038.',
        badge: 'FACT'
      }
    ],
    verdict: {
      doingRight: "You have built strong earning power ($270k gross income) and accumulated substantial liquid reserves ($150,800 accessible cash) with strong equity in your San Francisco home.",
      needsAttention: "Carrying an $18,000 credit card balance at 18% interest while holding $60,222 in excess cash above your emergency cushion is costing you thousands in guaranteed wasted interest.",
      overlooking: "Your risk orientation mismatch (Timothy leans growth, Melanie leans capital preservation) has caused analysis paralysis: you hoard cash rather than funding your $1.1M life insurance shortfall and 529 plans.",
      bottomLine: "You are not in financial danger; you are suffering from expensive indecision. Clear the debt with excess cash, protect your kids with term insurance, and put your money back on offense."
    },
    mission: {
      number: "MISSION 01",
      title: "Eliminate The 18% Credit Card Drag",
      whyItMatters: "Eliminating the $18,000 credit card immediately frees up $300/month in cash flow and stops $270/month in pure interest bleed, without compromising your core $84k emergency reserve.",
      firstAction: "Check your bank balances today and schedule a single $18,000 payoff transfer from your accessible cash above reserve ($60,222 available).",
      steps: [
        "Confirm your total accessible bank balance is at or above $150,000.",
        "Set aside your dedicated 9-month emergency reserve ($84,577.50) into a high-yield savings account.",
        "Use the surplus cash ($60,222.50) to submit a lump-sum payoff for the full $18,000 credit card balance.",
        "Redirect the $300/month previously spent on card minimums into the children's 529 education plan."
      ],
      timeframe: "Execute within 72 hours",
      howToVerify: "Credit card statement shows a zero balance and $0 finance charges on the next billing cycle.",
      estimatedDifficulty: "Low effort, immediate high impact"
    }
  },

  'michael-carter': {
    initialQuestion: {
      question: "On a scale from 0 to 100, what score do you think your financial trajectory deserves?",
      category: "perceived_health",
      type: "slider",
      options: null
    },
    dynamicQuestions: [
      {
        trigger: 'home_goal',
        question: "You want to buy a $550,000 home in January 2027 and retire at age 58. If the math showed you can only achieve one on your current timeline, which would you protect first?",
        options: [
          "Retirement at 58 is non-negotiable; I value my freedom over homeownership",
          "Buying the house in 2027 is my top priority; I can work a few more years",
          "I want to find a middle ground—maybe a lower-priced home or adjusted savings",
          "I believed my $180k salary would easily cover both"
        ]
      }
    ],
    revealReaction: (expected, actual, gap) => {
      return `You expected a score of ${expected}, but your official Sherpas financial health score is 26—placing you in the CRITICAL band. That is a brutal ${Math.abs(gap)}-point difference. Here is why: you earn a fantastic $180,000 salary, but your plan currently has a negative net cash flow of -$8,336 this year! Between car payments, student loans, credit card balances, and renting, your money is leaking out faster than you realize. Planning a $550,000 home purchase in 2027 alongside retiring at 58 is currently a collision course.`;
    },
    discoveries: [
      {
        id: 'carter-disc-1',
        title: 'THE CASH FLOW CRACK',
        figure: '-$8,336 Annual Net Cash Flow',
        source: 'Key Metrics — Cashflow Statement & Facts',
        explanation: 'Despite earning $180,000 gross, your annual outflows exceed inflows by $8,336 this year. You are burning liquid reserves rather than building the down payment required for 2027.',
        whyItMatters: 'A $550,000 home requires at least $110,000 in down payment and closing costs, but your accessible cash is currently only $30,000 against a $46,530 emergency requirement.',
        auditorRemark: 'A $180,000 salary that burns $8,336 a year is not wealth accumulation; it is high-speed lifestyle inflation. We need to plug the leak before you sign a mortgage.',
        badge: 'FACT'
      },
      {
        id: 'carter-disc-2',
        title: 'THE RETIREMENT COLLISION (AGE 85 CLIFF)',
        figure: 'Savings Run Out at Age 85',
        source: 'Key Metrics — Facts: Retirement Projections',
        explanation: 'Retiring at 58 means 33 years of retirement where guaranteed income covers only 34% of your spending needs. If you buy the $550k home in 2027 without restructuring, your liquid investments deplete at age 85 leaving unpaid living expenses.',
        whyItMatters: 'The house and the age-58 retirement are actively cannibalizing each other in your financial plan.',
        auditorRemark: 'You can have the house, or you can have retirement at 58 on your current track. Having both right now is financial fiction unless we fix your savings rate today.',
        badge: 'FACT'
      },
      {
        id: 'carter-disc-3',
        title: 'DEBT MULTIPLICATION',
        figure: '$28,500 Across 3 Debt Streams',
        source: 'Key Metrics — Debt Overview (Vehicle, Student, Amex)',
        explanation: 'You are paying $950/month across a BMW 3 Series ($500/mo, $15k balance), Student Loan ($250/mo, $10k balance), and Amex Platinum ($200/mo, $3,500 balance at 20%).',
        whyItMatters: 'That is $11,400 per year dedicated purely to debt service that could otherwise be funding your home down payment.',
        auditorRemark: 'That BMW and Amex are costing you nearly a thousand dollars every single month. That is your future down payment driving down the highway.',
        badge: 'FACT'
      }
    ],
    verdict: {
      doingRight: "You have exceptional earning power ($180,000), you are actively saving into your 401(k) up to employer match, and you have clear ambitious goals.",
      needsAttention: "Your monthly budget is running a deficit (-$8,336/yr), your cash is below the 5-month emergency target ($30k vs $46k), and your debt service consumes $950/month.",
      overlooking: "Your timeline is compressed: buying a $550,000 home in January 2027 while paying consumer debt guarantees that you will fall short of an early retirement at 58.",
      bottomLine: "You earn like a winner, but your cash flow is leaking like a sieve. Close the $8k deficit, eliminate the consumer debt, and reset the home timeline so you can actually retire at 58."
    },
    mission: {
      number: "MISSION 01",
      title: "Stem The Cash Leak & Knock Out The Amex",
      whyItMatters: "Turning your negative cash flow positive is the mandatory prerequisite before any mortgage underwriter looks at you for a $550,000 home loan.",
      firstAction: "Audit discretionary spending from last month to identify $700 in monthly lifestyle reductions and commit to paying off the $3,500 Amex balance in 60 days.",
      steps: [
        "Pull your last 60 days of credit card statements and flag dining, subscriptions, and discretionary expenses.",
        "Target $700/month in reductions to immediately flip your -$8,336 annual deficit into positive cash flow.",
        "Deploy $1,750/month for the next 2 months directly to the $3,500 Amex Platinum at 20% APR.",
        "Keep your $30,000 cash strictly quarantined as emergency reserves—do NOT touch it for discretionary purchases."
      ],
      timeframe: "Audit expenses in 48 hours; eliminate Amex in 60 days",
      howToVerify: "Amex balance reaches $0 and monthly cash flow shows at least $500 in positive surplus.",
      estimatedDifficulty: "Moderate — requires lifestyle discipline"
    }
  },

  'daniel-emily-johnson': {
    initialQuestion: {
      question: "On a scale from 0 to 100, how prepared do you feel your family is if an emergency struck tomorrow?",
      category: "perceived_health",
      type: "slider",
      options: null
    },
    dynamicQuestions: [
      {
        trigger: 'protection',
        question: "With Oliver (11) and Sophia (9) at home, what is your understanding of what would happen financially if either of your incomes stopped suddenly?",
        options: [
          "We assume employer life insurance would bridge the gap",
          "We know we are underinsured, but the premiums felt expensive",
          "We have focused all our spare cash on paying the mortgage and expenses",
          "We never calculated the exact dollar figure our kids would need"
        ]
      }
    ],
    revealReaction: (expected, actual, gap) => {
      return `You estimated a score of ${expected}, but your official Sherpas financial health score is 52—classified as VULNERABLE. You have done a lot right: you own your home, you have built retirement savings, and you prioritize your family. But there is a massive protection vulnerability: Daniel has only $250,000 in life insurance against a recommended minimum of $1,600,000, and Emily has zero coverage! Combined with an $18,000 credit card at a punishing 24.9% APR, your family's safety net has gaping holes.`;
    },
    discoveries: [
      {
        id: 'johnson-disc-1',
        title: 'THE $1,350,000 PROTECTION CHASM',
        figure: '$1.35M Life Insurance Deficit',
        source: 'Key Metrics — Life Insurance Ratios & Facts',
        explanation: 'Daniel has $250,000 of coverage against a minimum recommendation of $1.6M. Emily, whose income and household contribution are vital for Oliver (11) and Sophia (9), has $0 in coverage. With a $560,000 mortgage, existing coverage would not even pay off half the house.',
        whyItMatters: 'If either parent passes, the surviving spouse faces a mortgage and two college tuition bills with inadequate income replacement.',
        auditorRemark: 'You love your children deeply, but love does not pay off a $560,000 mortgage. A term policy is cheap peace of mind that should have been locked in years ago.',
        badge: 'FACT'
      },
      {
        id: 'johnson-disc-2',
        title: 'THE 24.9% CREDIT CARD TRAP',
        figure: '$18,000 Balance at 24.9% APR',
        source: 'Key Metrics — Debt Management Statement',
        explanation: 'At 24.9% APR, over $370 every single month goes straight into the credit card company’s pockets just for interest charges. It is your single most expensive financial liability.',
        whyItMatters: 'Paying minimums on a 24.9% card will cost over $15,000 in interest alone over time.',
        auditorRemark: 'Twenty-four point nine percent is loan shark territory. That card is setting fire to the college money you want to save for Oliver and Sophia.',
        badge: 'FACT'
      }
    ],
    verdict: {
      doingRight: "You have built meaningful equity in your Denver home and have steady dual incomes with a shared commitment to Oliver and Sophia's future.",
      needsAttention: "Your credit card debt ($18,000 at 24.9%) and lack of umbrella liability coverage expose your family to unnecessary drag and liability risk.",
      overlooking: "Your catastrophic protection gap: carrying only $250k in term life with two young children and a $560k mortgage means an unexpected tragedy would force a fire sale of the house.",
      bottomLine: "You have built a great home; now put a roof over it. Lock in proper term life insurance for both of you and declare war on the 24.9% credit card."
    },
    mission: {
      number: "MISSION 01",
      title: "Secure 20-Year Term Life & Protect The Kids",
      whyItMatters: "Protecting Oliver and Sophia with $1.5M in 20-year term coverage costs roughly $60–$90/month and permanently closes your single most dangerous vulnerability.",
      firstAction: "Request three competitive quotes for 20-year level term life insurance ($1.5M for Daniel, $750k for Emily) before the week ends.",
      steps: [
        "Calculate the required term: 20 years covers Oliver through age 31 and Sophia through age 29.",
        "Obtain term quotes from independent brokerages (Term4Sale or Policygenius) for 20-year level term policies.",
        "Submit the preliminary applications to lock in rates while in good health.",
        "Formulate a plan to attack the 24.9% credit card balance using monthly cash flow once protection is in underwriting."
      ],
      timeframe: "Obtain quotes within 5 days",
      howToVerify: "Both policy applications submitted and confirmation emails received.",
      estimatedDifficulty: "Low effort, paramount family security"
    }
  },

  'samantha-lewis': {
    initialQuestion: {
      question: "On a scale from 0 to 100, how rock-solid do you consider your overall financial independence?",
      category: "perceived_health",
      type: "slider",
      options: null
    },
    dynamicQuestions: [
      {
        trigger: 'high_score',
        question: "With a $250,000 salary, zero debt, and an 82 financial health score, you look bulletproof on paper. When you envision retirement, what age are you targeting, and what does your ideal lifestyle cost?",
        options: [
          "Retire around 65 and travel extensively without worrying about money",
          "Retire at 60 to spend time with Ethan and Ava's future families",
          "I haven't modeled the exact retirement numbers because my income has always handled everything",
          "My main focus right now is paying for college without taking on parent loans"
        ]
      }
    ],
    revealReaction: (expected, actual, gap) => {
      return `You estimated a score of ${expected}, and your official Sherpas financial health score is 82—a 'STRONG' score that places you in the top tier! You have accomplished something incredible: $250,000 income, completely debt-free, and $2,000,000 in life insurance. BUT here is why this audit exists: hiding beneath that shining 82 score is a ticking time bomb. Your plan projections reveal that your savings and investments are projected to RUN OUT AT AGE 73! Your average withdrawal rate in retirement is 12.2%—more than triple what is sustainable. If you fund upcoming college tuition for Ethan and Ava AND buy a home in 2030, your retirement will run dry 15 to 20 years prematurely!`;
    },
    discoveries: [
      {
        id: 'lewis-disc-1',
        title: 'THE AGE 73 RETIREMENT CLIFF',
        figure: 'Savings Run Out at Age 73 ($1.45M Deficit)',
        source: 'Key Metrics — Facts: Retirement Savings & Depletion',
        explanation: 'Your plan projects that savings and investments deplete at age 73, leaving $1,448,672 in planned retirement spending completely unfunded. Your guaranteed income (Social Security) covers only 25% of your living needs.',
        whyItMatters: 'A score of 82 reflects your pristine balance sheet TODAY, but disguises that your long-term plan is not sustainable without adjustments.',
        auditorRemark: 'An 82 score is like driving a brand-new Ferrari with an empty gas tank. You look magnificent right now, but you are going to sputter to a halt on the highway at age 73.',
        badge: 'FACT'
      },
      {
        id: 'lewis-disc-2',
        title: 'THE 12.2% WITHDRAWAL RATE DANGER',
        figure: '12.2% Average Withdrawal Rate',
        source: 'Key Metrics — Facts: Withdrawal Rate Ratio',
        explanation: 'The established safe withdrawal rate for retirement longevity is 4%. Your plan requires an average draw of 12.2% of your portfolio ($115,335/year) to support your lifestyle.',
        whyItMatters: 'At a 12.2% withdrawal rate, any normal market correction in your early retirement years triggers permanent capital exhaustion.',
        auditorRemark: 'A 12% withdrawal rate is not a retirement plan; it is a liquidation sale. We need to recalibrate your accumulation now while your earning power is at its peak.',
        badge: 'FACT'
      },
      {
        id: 'lewis-disc-3',
        title: 'THE THREE-WAY CASH FLOW COLLISION',
        figure: 'College Tuition vs. 2030 Home vs. Retirement',
        source: 'Key Metrics — Cashflow Statement & Goals',
        explanation: 'Ethan starts college now, Ava follows in 2 years, and you have slated a major home purchase in 2030. All three goals compete for the same after-tax cash flow, which already runs a small yearly deficit (-$6,417).',
        whyItMatters: 'Funding 100% of college costs and a luxury home purchase will permanently siphon the capital required to fix the age 73 cliff.',
        auditorRemark: 'Ethan and Ava can get student loans or grants if needed; nobody is going to give you a retirement loan at age 74.',
        badge: 'INTERPRETATION'
      }
    ],
    verdict: {
      doingRight: "You have built a powerhouse financial profile: $250k income, zero debt, exemplary $2M insurance protection, and complete independence as a single mother.",
      needsAttention: "Your annual cash flow has a minor deficit (-$6,417), and simultaneous goals (college for two teens + 2030 home purchase) will exhaust your liquid capital.",
      overlooking: "The dangerous illusion of the 82 score: you assume that being debt-free means your retirement is set, when in reality your investments run dry at age 73 with a $1.45M shortfall.",
      bottomLine: "You are winning the present, but on track to lose your future. Put boundaries around college and home spending so your retirement remains secure past age 90."
    },
    mission: {
      number: "MISSION 01",
      title: "Establish The Retirement Defense Boundary",
      whyItMatters: "Fixing your retirement longevity before committing to college tuition and 2030 home purchase caps ensures you never depend on your children in your 70s.",
      firstAction: "Set a firm upper cap on yearly college contributions ($30k/yr per child) and maximize your tax-advantaged retirement accounts to close the age 73 cliff.",
      steps: [
        "Review Ethan's upcoming college costs and determine the exact portion funded from cash flow vs financial aid.",
        "Increase your 401(k) / catch-up contributions to the IRS statutory maximum ($23,500+).",
        "Adjust the 2030 home purchase target to prevent draining your investment portfolio below $500,000.",
        "Model the revised plan in Sherpas to extend portfolio longevity from age 73 to age 90+."
      ],
      timeframe: "Finalize college allocation in 7 days",
      howToVerify: "Updated living map projection in Sherpas shows positive liquid assets through age 90.",
      estimatedDifficulty: "Moderate — requires psychological boundary setting"
    }
  }
};
