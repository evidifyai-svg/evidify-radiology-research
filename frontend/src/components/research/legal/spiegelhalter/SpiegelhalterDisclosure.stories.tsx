/**
 * SpiegelhalterDisclosure.stories.tsx
 *
 * Storybook stories demonstrating all Spiegelhalter uncertainty disclosure formats.
 *
 * These stories showcase the different ways to communicate AI uncertainty:
 * 1. Percentage - Traditional format
 * 2. Natural Frequency - Spiegelhalter's recommended format
 * 3. Icon Array - Visual representation
 * 4. Verbal Only - Accessibility-focused
 * 5. Verbal + Numeric - Combined format
 * 6. Odds - Betting-style format
 * 7. Comparative - Anchored to familiar risks
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { SpiegelhalterDisclosureDisplay, generateFormattedDisclosure } from './SpiegelhalterDisclosureDisplay';
import { PercentageDisclosure } from './PercentageDisclosure';
import { NaturalFrequencyDisclosure } from './NaturalFrequencyDisclosure';
import { IconArrayDisclosure } from './IconArrayDisclosure';
import { VerbalDisclosure } from './VerbalDisclosure';
import { OddsDisclosure } from './OddsDisclosure';
import { ComparativeDisclosure } from './ComparativeDisclosure';
import { ComprehensionCheck } from './ComprehensionCheck';
import type {
  AIDisclosure,
  SpiegelhalterDisclosureFormat,
  SpiegelhalterDisclosureConfig,
  AIMetrics,
  AIRecommendation,
} from './disclosureTypes';
import { DEFAULT_DISCLOSURE_CONFIG, DEFAULT_VERBAL_SCALE } from './disclosureTypes';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockMetrics: AIMetrics = {
  confidence: 0.87,
  fdr: 0.15, // 15% false discovery rate
  for: 0.03, // 3% false omission rate
  ppv: 0.85,
  npv: 0.97,
  sensitivity: 0.95,
  specificity: 0.88,
};

const mockRecommendationFlagged: AIRecommendation = {
  birads: 4,
  finding: 'Suspicious mass in upper outer quadrant, irregular margins',
  location: 'Left breast, 10 o\'clock position',
  isFlagged: true,
};

const mockRecommendationCleared: AIRecommendation = {
  birads: 1,
  finding: 'No significant findings',
  location: 'Right breast',
  isFlagged: false,
};

function createMockDisclosure(
  format: SpiegelhalterDisclosureFormat,
  isFlagged: boolean = true,
  overrideMetrics?: Partial<AIMetrics>
): AIDisclosure {
  const metrics = { ...mockMetrics, ...overrideMetrics };
  const recommendation = isFlagged ? mockRecommendationFlagged : mockRecommendationCleared;

  const config: SpiegelhalterDisclosureConfig = {
    ...DEFAULT_DISCLOSURE_CONFIG,
    format,
    showFDR: true,
    showFOR: true,
    showPPV: true,
    showNPV: true,
    showConfidence: true,
    showSensitivity: true,
    showSpecificity: true,
  };

  return generateFormattedDisclosure(metrics, recommendation, config);
}

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof SpiegelhalterDisclosureDisplay> = {
  title: 'Research/Spiegelhalter Disclosure',
  component: SpiegelhalterDisclosureDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Spiegelhalter Uncertainty Disclosure Framework

Implementation of David Spiegelhalter's research on communicating risk and uncertainty.

## Key Principles
1. **Natural frequencies outperform percentages** - "15 out of 100" is better understood than "15%"
2. **Consistent denominators** - Always use the same base (e.g., 100) to prevent confusion
3. **Verbal + numeric together** - Accessibility combined with precision
4. **Icon arrays help visual learners** - Part-to-whole comparisons are intuitive
5. **Acknowledge uncertainty explicitly** - Builds appropriate trust

## Research Citations
- Spiegelhalter, D. (2017). Risk and Uncertainty Communication. Annual Review of Statistics.
- Hoffrage, U., et al. (2000). Communicating Statistical Information. Science.
- Gigerenzer, G. (2002). Calculated Risks. Simon & Schuster.
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SpiegelhalterDisclosureDisplay>;

// ============================================================================
// STORIES: MAIN COMPONENT
// ============================================================================

export const Percentage: Story = {
  args: {
    disclosure: createMockDisclosure('PERCENTAGE'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Traditional percentage format. Common but often misunderstood.',
      },
    },
  },
};

export const NaturalFrequency: Story = {
  args: {
    disclosure: createMockDisclosure('NATURAL_FREQUENCY'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Spiegelhalter's recommended format.**

Research shows natural frequencies are understood better than percentages:
- "15 out of 100" vs "15%"
- Makes base rate explicit
- Reduces denominator neglect
        `,
      },
    },
  },
};

export const IconArray: Story = {
  args: {
    disclosure: createMockDisclosure('ICON_ARRAY'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
Visual representation using a grid of 100 icons.

Benefits:
- Part-to-whole comparison is intuitive
- Reduces denominator neglect (Galesic et al., 2009)
- Helpful for visual learners
        `,
      },
    },
  },
};

export const VerbalOnly: Story = {
  args: {
    disclosure: createMockDisclosure('VERBAL_ONLY'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
Verbal labels only (e.g., "Low", "High").

Pros:
- Highly accessible
- Works across numeracy levels

Cons:
- Ambiguous - "Low" means different things to different people
- Less precise than numeric formats
        `,
      },
    },
  },
};

export const VerbalPlusNumeric: Story = {
  args: {
    disclosure: createMockDisclosure('VERBAL_PLUS_NUMERIC'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Combines accessibility with precision.**

"Low likelihood (15%)" gives both:
- Intuitive verbal anchor
- Precise numeric value

Spiegelhalter recommends this for broad audiences.
        `,
      },
    },
  },
};

export const Odds: Story = {
  args: {
    disclosure: createMockDisclosure('ODDS'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
Betting-style odds format (e.g., "5 to 1").

Familiar to:
- Clinicians (from gambling context)
- Some patients

Can be confusing for extreme probabilities.
        `,
      },
    },
  },
};

export const Comparative: Story = {
  args: {
    disclosure: createMockDisclosure('COMPARATIVE'),
    showRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
Anchored to familiar risks (e.g., "Similar to...").

Uses anchoring effect (Lipkus, 2007) to make abstract probabilities concrete.

Anchor examples:
- Coin flip (50%)
- Mammogram false positive (~10%)
- Car accident this year (~1%)
        `,
      },
    },
  },
};

// ============================================================================
// STORIES: CONTEXT VARIATIONS
// ============================================================================

export const ClearedCase: Story = {
  args: {
    disclosure: createMockDisclosure('NATURAL_FREQUENCY', false),
    showRecommendation: true,
  },
  name: 'Cleared Case (FOR emphasis)',
  parameters: {
    docs: {
      description: {
        story: 'When AI clears a case, we emphasize False Omission Rate (FOR) instead of FDR.',
      },
    },
  },
};

export const HighErrorRate: Story = {
  args: {
    disclosure: createMockDisclosure('NATURAL_FREQUENCY', true, { fdr: 0.35 }),
    showRecommendation: true,
  },
  name: 'High Error Rate (35% FDR)',
  parameters: {
    docs: {
      description: {
        story: 'Disclosure when AI has high error rate. Visual formats make this more salient.',
      },
    },
  },
};

export const LowConfidence: Story = {
  args: {
    disclosure: createMockDisclosure('VERBAL_PLUS_NUMERIC', true, { confidence: 0.55 }),
    showRecommendation: true,
  },
  name: 'Low Confidence (55%)',
  parameters: {
    docs: {
      description: {
        story: 'AI with low confidence. Uncertainty should be prominently communicated.',
      },
    },
  },
};

export const CompactMode: Story = {
  args: {
    disclosure: createMockDisclosure('NATURAL_FREQUENCY'),
    compact: true,
    showRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact display for inline usage.',
      },
    },
  },
};

// ============================================================================
// STORIES: COMPREHENSION CHECK
// ============================================================================

export const WithComprehensionCheck: Story = {
  render: () => {
    const [showCheck, setShowCheck] = useState(false);
    const [passed, setPassed] = useState<boolean | null>(null);
    const disclosure = createMockDisclosure('NATURAL_FREQUENCY');

    return (
      <div className="space-y-4">
        <SpiegelhalterDisclosureDisplay
          disclosure={disclosure}
          showRecommendation={true}
          onAcknowledge={() => setShowCheck(true)}
        />

        {showCheck && passed === null && (
          <ComprehensionCheck
            disclosure={disclosure}
            onComplete={(check, allPassed) => {
              setPassed(allPassed);
            }}
          />
        )}

        {passed !== null && (
          <div
            className={`p-4 rounded-lg ${
              passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {passed ? 'Comprehension check passed!' : 'Comprehension check failed.'}
          </div>
        )}
      </div>
    );
  },
  name: 'With Comprehension Check',
  parameters: {
    docs: {
      description: {
        story: `
Comprehension check verifies the user understood the disclosure.

Questions are generated based on the format shown.
Spiegelhalter recommends testing understanding with simple questions.
        `,
      },
    },
  },
};

// ============================================================================
// STORIES: FORMAT COMPARISON
// ============================================================================

export const AllFormatsComparison: Story = {
  render: () => {
    const formats: SpiegelhalterDisclosureFormat[] = [
      'PERCENTAGE',
      'NATURAL_FREQUENCY',
      'ICON_ARRAY',
      'VERBAL_ONLY',
      'VERBAL_PLUS_NUMERIC',
      'ODDS',
      'COMPARATIVE',
    ];

    return (
      <div className="space-y-6" style={{ width: '800px' }}>
        <h2 className="text-xl font-bold text-white mb-4">
          All Spiegelhalter Disclosure Formats
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Same underlying data (15% FDR) displayed in different formats.
          Notice how different formats may affect your intuitive understanding.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {formats.map((format) => (
            <div key={format} className="p-4 bg-slate-900 rounded-lg">
              <div className="text-xs text-purple-400 mb-2 uppercase tracking-wider">
                {format.replace(/_/g, ' ')}
              </div>
              <SpiegelhalterDisclosureDisplay
                disclosure={createMockDisclosure(format)}
                compact={true}
                showRecommendation={false}
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
  name: 'All Formats Comparison',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: `
Side-by-side comparison of all disclosure formats with the same underlying data.

This demonstrates how format affects perception of the same statistical information.
        `,
      },
    },
  },
};

// ============================================================================
// STORIES: INDIVIDUAL COMPONENTS
// ============================================================================

export const PercentageComponent: Story = {
  render: () => (
    <PercentageDisclosure
      disclosure={createMockDisclosure('PERCENTAGE')}
      compact={false}
    />
  ),
  name: 'Percentage Component (Standalone)',
};

export const NaturalFrequencyComponent: Story = {
  render: () => (
    <NaturalFrequencyDisclosure
      disclosure={createMockDisclosure('NATURAL_FREQUENCY')}
      compact={false}
    />
  ),
  name: 'Natural Frequency Component (Standalone)',
};

export const IconArrayComponent: Story = {
  render: () => (
    <IconArrayDisclosure
      disclosure={createMockDisclosure('ICON_ARRAY')}
      compact={false}
    />
  ),
  name: 'Icon Array Component (Standalone)',
};

export const VerbalComponent: Story = {
  render: () => (
    <VerbalDisclosure
      disclosure={createMockDisclosure('VERBAL_PLUS_NUMERIC')}
      showNumeric={true}
      compact={false}
    />
  ),
  name: 'Verbal Component (Standalone)',
};

export const OddsComponent: Story = {
  render: () => (
    <OddsDisclosure
      disclosure={createMockDisclosure('ODDS')}
      compact={false}
    />
  ),
  name: 'Odds Component (Standalone)',
};

export const ComparativeComponent: Story = {
  render: () => (
    <ComparativeDisclosure
      disclosure={createMockDisclosure('COMPARATIVE')}
      compact={false}
    />
  ),
  name: 'Comparative Component (Standalone)',
};
