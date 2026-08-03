use super::domain;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NarrativeTemplateId {
    KnowledgeDossier,
    ProjectBlueprint,
    LearningJourney,
}

impl NarrativeTemplateId {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "knowledge_dossier" => Some(Self::KnowledgeDossier),
            "project_blueprint" => Some(Self::ProjectBlueprint),
            "learning_journey" => Some(Self::LearningJourney),
            _ => None,
        }
    }
    pub fn as_str(self) -> &'static str {
        match self {
            Self::KnowledgeDossier => "knowledge_dossier",
            Self::ProjectBlueprint => "project_blueprint",
            Self::LearningJourney => "learning_journey",
        }
    }
    pub fn scene_titles(self) -> &'static [&'static str] {
        match self {
            Self::KnowledgeDossier => &["Overview", "Evidence", "Timeline"],
            Self::ProjectBlueprint => &["Vision", "Plan", "Milestones", "Review"],
            Self::LearningJourney => &["Goals", "Concepts", "Practice", "Reflection"],
        }
    }
}

pub fn seed_document(template: NarrativeTemplateId, document_id: &str, node_title: &str) -> String {
    let scenes: Vec<_> = template.scene_titles().iter().map(|title| serde_json::json!({
        "id": domain::new_id(), "title": title, "layoutPreset": "single_column", "atmosphere": "neutral", "motionPreset": "none",
        "blocks": [{"kind":"rich_text","id":domain::new_id(),"content":{"type":"doc","content":[{"type":"paragraph"}]}}]
    })).collect();
    serde_json::json!({"schemaVersion":1,"documentId":document_id,"title":node_title,"templateId":template.as_str(),"templateVersion":1,"scenes":scenes}).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::schema;
    #[test]
    fn catalog_seeds_are_exact_and_valid() {
        for (id, titles) in [
            (
                NarrativeTemplateId::KnowledgeDossier,
                vec!["Overview", "Evidence", "Timeline"],
            ),
            (
                NarrativeTemplateId::ProjectBlueprint,
                vec!["Vision", "Plan", "Milestones", "Review"],
            ),
            (
                NarrativeTemplateId::LearningJourney,
                vec!["Goals", "Concepts", "Practice", "Reflection"],
            ),
        ] {
            let doc_id = domain::new_id();
            let json = seed_document(id, &doc_id, "Leaf");
            let value: serde_json::Value = serde_json::from_str(&json).unwrap();
            assert_eq!(value["templateId"], id.as_str());
            assert_eq!(value["templateVersion"], 1);
            assert_eq!(
                value["scenes"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|s| s["title"].as_str().unwrap())
                    .collect::<Vec<_>>(),
                titles
            );
            assert!(schema::validate(&json, Some(&doc_id)).is_ok());
        }
    }
}
