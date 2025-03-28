import { useEffect, useMemo } from 'react';
import { keyBy } from 'lodash';
import styled from 'styled-components';
import { Form, Modal, Select, Tag } from 'antd';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import { ERROR_TEXTS } from '@/utils/error';
import { ModalAction } from '@/hooks/useModalAction';
import MarkdownEditor from '@/components/editor/MarkdownEditor';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';

const MultiSelect = styled(Select)`
  .ant-select-selector {
    padding-top: 3px;
  }
  .ant-tag {
    padding: 3px 5px;
    margin-right: 3px;
    margin-bottom: 3px;
  }
`;

const TagText = styled.div`
  line-height: 16px;
`;

type Props = ModalAction<{
  retrievedTables: string[];
  sqlGenerationReasoning: string;
}> & {
  loading?: boolean;
};

export default function AdjustReasoningStepsModal(props: Props) {
  const { visible, defaultValue, loading, onSubmit, onClose } = props;
  const [form] = Form.useForm();

  const listModelsResult = useListModelsQuery();
  const modelIdMap = keyBy(listModelsResult.data?.listModels, 'id');
  const modelOptions = useMemo(() => {
    return listModelsResult.data?.listModels.map((model) => ({
      label: model.displayName,
      value: model.id,
    }));
  }, [listModelsResult.data?.listModels]);

  useEffect(() => {
    if (!visible) return;
    const listModels = listModelsResult.data?.listModels || [];
    const retrievedTables = listModels.reduce((result, model) => {
      if (defaultValue?.retrievedTables.includes(model.referenceName)) {
        result.push({ label: model.displayName, value: model.id });
      }
      return result;
    }, []);
    form.setFieldsValue({ ...defaultValue, retrievedTables });
  }, [form, defaultValue, visible, listModelsResult.data?.listModels]);

  const tagRender = (props) => {
    const { value, closable, onClose } = props;
    const model = modelIdMap[value];
    return (
      <Tag
        onMouseDown={(e) => e.stopPropagation()}
        closable={closable}
        onClose={onClose}
        className="d-flex align-center bg-gray-3 border-gray-3"
        style={{ maxWidth: 140 }}
      >
        <div className="pr-1" style={{ minWidth: 0 }}>
          <TagText className="gray-8 text-truncate" title={model.displayName}>
            {model.displayName}
          </TagText>
          <TagText
            className="gray-7 text-xs text-truncate"
            title={model.referenceName}
          >
            {model.referenceName}
          </TagText>
        </div>
      </Tag>
    );
  };

  const reset = () => {
    form.resetFields();
  };

  const submit = async () => {
    form
      .validateFields()
      .then(async (values) => {
        await onSubmit(values.steps);
        onClose();
      })
      .catch(console.error);
  };

  return (
    <Modal
      title="Adjust steps"
      width={640}
      visible={visible}
      okText="Regenerate answer"
      onOk={submit}
      onCancel={onClose}
      confirmLoading={loading}
      maskClosable={false}
      destroyOnClose
      centered
      afterClose={reset}
    >
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="Selected models"
          name="retrievedTables"
          required={false}
          rules={[
            {
              required: true,
              message: ERROR_TEXTS.ADJUST_REASONING.SELECTED_MODELS.REQUIRED,
            },
          ]}
          extra={
            <div className="text-sm gray-6 mt-1">
              Select the tables needed to answer your question.{' '}
              <span className="gray-7">
                Tables not selected won't be used in SQL generation.
              </span>
            </div>
          }
        >
          <MultiSelect
            mode="multiple"
            placeholder="Select models"
            options={modelOptions}
            tagRender={tagRender}
          />
        </Form.Item>
        <Form.Item
          label="Reasoning steps"
          className="pb-0"
          extra={
            <div className="text-sm gray-6 mt-1">
              <QuestionCircleOutlined className="mr-1" />
              Protip: Use @ to choose model in the textarea.
            </div>
          }
        >
          <div className="text-sm gray-6 mb-1">
            Edit the reasoning logic below. Each step should build toward
            answering the question accurately.
          </div>
          <Form.Item
            noStyle
            name="sqlGenerationReasoning"
            required={false}
            rules={[
              {
                required: true,
                message: ERROR_TEXTS.ADJUST_REASONING.STEPS.REQUIRED,
              },
              {
                max: 3000,
                message: ERROR_TEXTS.ADJUST_REASONING.STEPS.MAX_LENGTH,
              },
            ]}
          >
            <MarkdownEditor maxLength={3000} />
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
}
