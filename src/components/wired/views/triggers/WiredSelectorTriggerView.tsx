import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';
import { WiredSelectorTriggerMetadata } from './WiredSelectorTriggerMetadata';

interface WiredSelectorTriggerViewProps
{
    metadata: WiredSelectorTriggerMetadata;
}

export const WiredSelectorTriggerView: FC<WiredSelectorTriggerViewProps> = props =>
{
    const { metadata = null } = props;
    const { trigger = null, setIntParams = null, furniIds = [] } = useWired();
    const [ fieldValues, setFieldValues ] = useState<Record<string, string>>({});
    const [ validationMessage, setValidationMessage ] = useState<string>('');

    useEffect(() =>
    {
        if(!trigger || !metadata) return;

        const values: Record<string, string> = {};
        const intData = trigger.intData || [];

        metadata.fields.forEach((field, index) =>
        {
            values[field.key] = String((intData[index] !== undefined) ? intData[index] : field.defaultValue);
        });

        setFieldValues(values);
    }, [ trigger, metadata ]);

    const validate = () =>
    {
        if(metadata.requiresReference && furniIds.length !== 1)
        {
            setValidationMessage('Selecione exatamente uma mobília de referência antes de salvar.');

            return false;
        }

        const invalidField = metadata.fields.find(field =>
        {
            const value = fieldValues[field.key];

            if(value === undefined || !value.trim().length) return true;

            const parsedValue = Number(value);

            if(!Number.isInteger(parsedValue)) return true;

            if((field.min !== undefined) && (parsedValue < field.min)) return true;

            if(field.options && !field.options.some(option => (option.value === parsedValue))) return true;

            return false;
        });

        if(invalidField)
        {
            const rule = invalidField.options ? 'escolha uma opção listada' : `informe um inteiro maior ou igual a ${ invalidField.min ?? 0 }`;
            setValidationMessage(`Confira o campo “${ invalidField.label }”: ${ rule }.`);

            return false;
        }

        setValidationMessage('');

        return true;
    }

    const save = () => setIntParams(metadata.fields.map(field => Number(fieldValues[field.key])));

    const targetLabel = (metadata.targetCategory === 'furni') ? 'Mobílias' : 'Usuários';

    return (
        <WiredBaseView
            wiredType="selector"
            className="nitro-wired-selector"
            requiresFurni={ metadata.requiresReference ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE }
            hasSpecialInput={ true }
            save={ save }
            validate={ validate }>
            <Column gap={ 1 }>
                <Text bold>{ metadata.title }</Text>
                <Text small>{ metadata.description }</Text>
                <Text small>Categoria alvo: { targetLabel }.</Text>
                { metadata.targetCategory === 'users' &&
                    <Text small>Teleport e Give Effect processam RoomUnits selecionados. Give Hand Item só é aplicado a Habbos; Pets e Bots são ignorados.</Text> }
                { (metadata.logicalType === 'area') &&
                    <Text small>
                        X e Y são coordenadas da sala. Não é possível arrastar ou selecionar a área visualmente, pois a API não oferece uma ferramenta de seleção.
                    </Text> }
                { metadata.fields.map(field =>
                    <div key={ field.key }>
                        <label className="form-label mb-1" htmlFor={ `wired-selector-${ metadata.code }-${ field.key }` }>{ field.label }</label>
                        { field.options ?
                            <select
                                id={ `wired-selector-${ metadata.code }-${ field.key }` }
                                className="form-select form-select-sm"
                                value={ fieldValues[field.key] ?? String(field.defaultValue) }
                                onChange={ event => setFieldValues(previous => ({ ...previous, [field.key]: event.target.value })) }>
                                { field.options.map(option => <option key={ option.value } value={ option.value }>{ option.value } — { option.label }</option>) }
                            </select> :
                            <input
                                id={ `wired-selector-${ metadata.code }-${ field.key }` }
                                type="number"
                                min={ field.min }
                                step={ 1 }
                                className="form-control form-control-sm"
                                value={ fieldValues[field.key] ?? String(field.defaultValue) }
                                onChange={ event => setFieldValues(previous => ({ ...previous, [field.key]: event.target.value })) } /> }
                    </div>) }
                { metadata.requiresReference &&
                    <Text small>
                        Selecione exatamente uma mobília de referência ({ furniIds.length } selecionada(s)). O salvamento exige uma única seleção.
                    </Text> }
                { !!validationMessage && <div role="alert" className="text-danger small">{ validationMessage }</div> }
            </Column>
        </WiredBaseView>
    );
}
