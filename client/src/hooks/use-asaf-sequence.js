import { useState, useEffect, useRef } from 'react';

export const useAsafSequence = (yanivResult) => {
    const [showAsaf, setShowAsaf] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        clearTimeout(timerRef.current);
        if (!yanivResult?.asaf) {
            setShowAsaf(false);
            return;
        }
        timerRef.current = setTimeout(() => setShowAsaf(true), 1500);
        return () => clearTimeout(timerRef.current);
    }, [yanivResult]);

    return showAsaf;
};
