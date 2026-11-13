import { ConditionDefinition, TriggerDefinition, WiredActionDefinition } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { useWired } from '../../hooks';
import { WiredActionLayoutView } from './views/actions/WiredActionLayoutView';
import { WiredConditionLayoutView } from './views/conditions/WiredConditionLayoutView';
import { WiredTriggerLayoutView } from './views/triggers/WiredTriggerLayoutView';
import { getWiredSelectorTriggerMetadata } from './views/triggers/WiredSelectorTriggerMetadata';
import { WiredSelectorTriggerView } from './views/triggers/WiredSelectorTriggerView';

export const WiredView: FC<{}> = props =>
{
    const { trigger = null } = useWired();

    if(!trigger) return null;

    if(trigger instanceof WiredActionDefinition) return WiredActionLayoutView(trigger.code);

    if(trigger instanceof TriggerDefinition)
    {
        const selectorMetadata = getWiredSelectorTriggerMetadata(trigger.stringData);

        if(selectorMetadata) return <WiredSelectorTriggerView key={ selectorMetadata.code } metadata={ selectorMetadata } />;

        return WiredTriggerLayoutView(trigger.code);
    }
    
    if(trigger instanceof ConditionDefinition) return WiredConditionLayoutView(trigger.code);
    
    return null;
};
