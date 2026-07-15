import 'react-native-get-random-values'
import uuid from 'react-native-uuid'

export const createUuid = () => String(uuid.v4())
