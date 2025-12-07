import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import FormComponent from "@components/FormComponent";

const RunPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="contextPage">
        <h1 className="sectionTitle">Recursive Prompt Improver</h1>
        <Button
          size="md"
          variant="ghost"
          onClick={() => navigate("/sessions")}
        >
          <History className="mr-2 h-4 w-4" />
          Sessions
        </Button>
      </div>
      <FormComponent />
    </div>
  );
};

export default RunPage;
