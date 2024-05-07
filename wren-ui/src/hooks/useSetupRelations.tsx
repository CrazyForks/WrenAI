import { useMemo, useState } from 'react';
import { SETUP } from '@/utils/enum';
import { useRouter } from 'next/router';
import { SelectedRecommendRelations } from '@/components/pages/setup/DefineRelations';
import { Path } from '@/utils/enum';
import {
  useAutoGeneratedRelationsQuery,
  useSaveRelationsMutation,
} from '@/apollo/client/graphql/dataSource.generated';

export default function useSetupRelations() {
  const [stepKey] = useState(SETUP.DEFINE_RELATIONS);
  const router = useRouter();

  const { data, loading: fetching } = useAutoGeneratedRelationsQuery({
    fetchPolicy: 'no-cache',
  });
  const autoGenerateRelation = data?.autoGenerateRelation;

  const onRedirectToHomePage = () => router.push(Path.Home);

  const [saveRelationsMutation, { loading: submitting }] =
    useSaveRelationsMutation({
      onError: (error) => console.error(error),
      onCompleted: () => onRedirectToHomePage(),
    });

  const submitReleations = async (
    relationsData: SelectedRecommendRelations,
  ) => {
    const relations = Object.entries(relationsData).reduce(
      (acc, [_modleName, relations]) => {
        const newRelations = relations.map((relation) => {
          return {
            fromModelId: Number(relation.fromField.modelId),
            fromColumnId: Number(relation.fromField.fieldId),
            toModelId: Number(relation.toField.modelId),
            toColumnId: Number(relation.toField.fieldId),
            type: relation.type,
          };
        });

        acc = [...acc, ...newRelations];
        return acc;
      },
      [],
    );

    // redirect to the home page if there is no relationship data needs to be saved
    if (relations.length === 0) {
      onRedirectToHomePage();
      return;
    }

    await saveRelationsMutation({
      variables: { data: { relations } },
    });
  };

  const onBack = () => {
    router.push('/setup/models');
  };

  const onNext = (data: { relations: SelectedRecommendRelations }) => {
    submitReleations(data.relations);
  };

  const recommendRelationsResult = useMemo(
    () =>
      (autoGenerateRelation || []).reduce(
        (acc, currentValue) => {
          const { displayName, referenceName, relations } = currentValue;
          const newRelations = relations.map((relation) => {
            return {
              name: relation.name,
              fromField: {
                modelId: String(relation.fromModelId),
                modelName: relation.fromModelReferenceName,
                fieldId: String(relation.fromColumnId),
                fieldName: relation.fromColumnReferenceName,
              },
              toField: {
                modelId: String(relation.toModelId),
                modelName: relation.toModelReferenceName,
                fieldId: String(relation.toColumnId),
                fieldName: relation.toColumnReferenceName,
              },
              type: relation.type,
              isAutoGenerated: true,
            };
          });

          acc['recommendRelations'][referenceName] = newRelations;
          acc['recommendNameMappping'][referenceName] = displayName;
          return acc;
        },
        {
          recommendRelations: {},
          recommendNameMappping: {},
        },
      ),
    [autoGenerateRelation],
  );

  return {
    fetching,
    submitting,
    stepKey,
    recommendRelationsResult,
    onBack,
    onNext,
    onSkip: onRedirectToHomePage,
  };
}
