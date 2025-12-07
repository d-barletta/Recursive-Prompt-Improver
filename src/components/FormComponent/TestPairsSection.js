import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TestPairComponent from "./TestPairComponent";
import { MAX_NUM_TESTS } from "@utils/constants";

const TestPairsSection = ({
  inOutPairs,
  isLoading,
  isImprovingPrompt,
  fillingOutputIndex,
  testPairRowFocused,
  onInputChange,
  onOutputChange,
  onInputFocus,
  onInputBlur,
  onOutputFocus,
  onOutputBlur,
  onSettingsClick,
  onFillOutput,
  onDuplicate,
  onRemove,
  onRemoveCheckType,
  onRemoveJsonSchema,
  onRemoveContext,
  onRemoveKnowledgeBases,
  onRemoveImages,
  onRemoveModel,
  onAddPair,
  getLastSessionScoreByTestIndex,
}) => {
  return (
    <>
      {inOutPairs.map((pair, index) => (
        <TestPairComponent
          key={index}
          pair={pair}
          index={index}
          isLoading={isLoading}
          isImprovingPrompt={isImprovingPrompt}
          isFillingOutput={fillingOutputIndex === index}
          testPairRowFocused={testPairRowFocused}
          totalPairs={inOutPairs.length}
          lastSessionScore={getLastSessionScoreByTestIndex(index)}
          onInputChange={(idx, value) => onInputChange(idx, value)}
          onOutputChange={(idx, value) => onOutputChange(idx, value)}
          onInputFocus={onInputFocus}
          onInputBlur={onInputBlur}
          onOutputFocus={onOutputFocus}
          onOutputBlur={onOutputBlur}
          onSettingsClick={(idx) => onSettingsClick(idx)}
          onFillOutput={onFillOutput}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onRemoveCheckType={(idx, checkTypeId) => onRemoveCheckType(idx, checkTypeId)}
          onRemoveJsonSchema={(idx) => onRemoveJsonSchema(idx)}
          onRemoveContext={(idx) => onRemoveContext(idx)}
          onRemoveKnowledgeBases={(idx) => onRemoveKnowledgeBases(idx)}
          onRemoveImages={(idx) => onRemoveImages(idx)}
          onRemoveModel={(idx) => onRemoveModel(idx)}
        />
      ))}
      <div className="addContainer w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddPair}
          disabled={isLoading || inOutPairs.length >= MAX_NUM_TESTS}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Test
        </Button>
      </div>
    </>
  );
};

export default TestPairsSection;
